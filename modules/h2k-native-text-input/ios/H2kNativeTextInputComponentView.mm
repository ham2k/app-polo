// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

#import "H2kNativeTextInputComponentView.h"

#import <react/renderer/components/H2kNativeTextInputSpec/ComponentDescriptors.h>
#import <react/renderer/components/H2kNativeTextInputSpec/EventEmitters.h>
#import <react/renderer/components/H2kNativeTextInputSpec/Props.h>
#import <react/renderer/components/H2kNativeTextInputSpec/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFont.h>

using namespace facebook::react;

// U+0001 (SOH). Must match `CURSOR` in formatters.js / CURSOR_SENTINEL on Android.
static unichar const kCursorSentinel = 0x0001;

#pragma mark - UITextField subclass (catches hardware Tab)

@protocol H2kTextFieldKeyDelegate <NSObject>
- (void)h2kTextFieldDidPressTab;
@end

@interface H2kTextField : UITextField
@property (nonatomic, weak) id<H2kTextFieldKeyDelegate> keyDelegate;
@end

@implementation H2kTextField
- (void)pressesBegan:(NSSet<UIPress *> *)presses withEvent:(UIPressesEvent *)event
{
  for (UIPress *press in presses) {
    if (press.key.keyCode == UIKeyboardHIDUsageKeyboardTab) {
      [self.keyDelegate h2kTextFieldDidPressTab];
      return;
    }
  }
  [super pressesBegan:presses withEvent:event];
}
@end

#pragma mark - Component view

@interface H2kNativeTextInputComponentView () <RCTH2kNativeTextInputViewProtocol, UITextFieldDelegate, H2kTextFieldKeyDelegate>
@end

@implementation H2kNativeTextInputComponentView {
  H2kTextField *_textField;
  NSInteger _eventCount;   // native-authoritative; mirrors Android nativeEventCount
  BOOL _uppercase;
  BOOL _applyingFromProps;
  BOOL _spaceNavigates;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<H2kNativeTextInputComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const H2kNativeTextInputProps>();
    _props = defaultProps;

    _textField = [[H2kTextField alloc] initWithFrame:self.bounds];
    _textField.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _textField.delegate = self;
    _textField.keyDelegate = self;
    _textField.autocorrectionType = UITextAutocorrectionTypeNo;
    _textField.spellCheckingType = UITextSpellCheckingTypeNo;
    // Disable smart punctuation: it rewrites '-' and quotes into typographic
    // variants, which corrupts callsigns/grids/refs.
    _textField.smartQuotesType = UITextSmartQuotesTypeNo;
    _textField.smartDashesType = UITextSmartDashesTypeNo;
    _textField.smartInsertDeleteType = UITextSmartInsertDeleteTypeNo;
    _spaceNavigates = YES;
    [_textField addTarget:self action:@selector(textFieldDidChange) forControlEvents:UIControlEventEditingChanged];

    self.contentView = _textField;
  }
  return self;
}

#pragma mark - Props

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<const H2kNativeTextInputProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const H2kNativeTextInputProps>(props);

  if (oldViewProps.placeholder != newViewProps.placeholder) {
    _textField.placeholder = RCTNSStringFromString(newViewProps.placeholder);
  }

  if (oldViewProps.editable != newViewProps.editable) {
    _textField.enabled = newViewProps.editable;
  }

  if (oldViewProps.uppercase != newViewProps.uppercase) {
    _uppercase = newViewProps.uppercase;
  }

  if (oldViewProps.keyboardProfile != newViewProps.keyboardProfile ||
      oldViewProps.uppercase != newViewProps.uppercase) {
    [self applyKeyboardProfile:newViewProps.keyboardProfile uppercase:newViewProps.uppercase];
  }

  if (oldViewProps.spaceKeyMode != newViewProps.spaceKeyMode) {
    _spaceNavigates = newViewProps.spaceKeyMode != "insert";
  }

  if (oldViewProps.keyboardAppearance != newViewProps.keyboardAppearance) {
    _textField.keyboardAppearance =
        (newViewProps.keyboardAppearance == "dark") ? UIKeyboardAppearanceDark : UIKeyboardAppearanceLight;
  }

  if (oldViewProps.fontSize != newViewProps.fontSize ||
      oldViewProps.fontFamily != newViewProps.fontFamily ||
      oldViewProps.fontWeight != newViewProps.fontWeight) {
    NSString *family = newViewProps.fontFamily.empty() ? nil : RCTNSStringFromString(newViewProps.fontFamily);
    NSString *weight = newViewProps.fontWeight.empty() ? nil : RCTNSStringFromString(newViewProps.fontWeight);
    NSNumber *size = newViewProps.fontSize > 0 ? @(newViewProps.fontSize) : nil;
    // RCTFont resolves RN-registered (bundled) fonts like "Roboto Mono".
    _textField.font = [RCTFont updateFont:_textField.font
                               withFamily:family
                                     size:size
                                   weight:weight
                                    style:nil
                                  variant:nil
                          scaleMultiplier:1.0];
  }

  if (oldViewProps.color != newViewProps.color) {
    _textField.textColor = RCTUIColorFromSharedColor(newViewProps.color);
  }

  // Apply the controlled value last, honoring the eventCount race guard.
  if (newViewProps.mostRecentEventCount >= _eventCount &&
      oldViewProps.text != newViewProps.text) {
    [self applyTextWithCursor:RCTNSStringFromString(newViewProps.text)];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)applyKeyboardProfile:(const std::string &)profile uppercase:(BOOL)uppercase
{
  if (profile == "numbers") {
    _textField.keyboardType = UIKeyboardTypeNumbersAndPunctuation; // iOS has no number-row on alpha
  } else if (profile == "email") {
    _textField.keyboardType = UIKeyboardTypeEmailAddress;
  } else if (profile == "code" || profile == "dumb") {
    _textField.keyboardType = UIKeyboardTypeASCIICapable;
  } else {
    _textField.keyboardType = UIKeyboardTypeDefault;
  }

  _textField.autocapitalizationType =
      uppercase ? UITextAutocapitalizationTypeAllCharacters
                : (profile == "default" ? UITextAutocapitalizationTypeSentences
                                        : UITextAutocapitalizationTypeNone);
}

#pragma mark - Text / cursor

// `value` may contain one sentinel marking the desired caret position.
- (void)applyTextWithCursor:(NSString *)value
{
  NSRange marker = [value rangeOfString:[NSString stringWithCharacters:&kCursorSentinel length:1]];
  NSString *clean = value;
  NSInteger caret = -1;
  if (marker.location != NSNotFound) {
    clean = [value stringByReplacingCharactersInRange:marker withString:@""];
    caret = (NSInteger)marker.location;
  }

  // If the text already matches, do NOT reassign .text: it disrupts the IME
  // (marked text / autocorrection) and can drop fast soft-keyboard input. The
  // caret is already where the user's keystroke left it. Only a formatter that
  // actually changed the text needs to write back.
  if ([clean isEqualToString:(_textField.text ?: @"")]) {
    return;
  }

  _applyingFromProps = YES;
  _textField.text = clean;
  _applyingFromProps = NO;

  NSInteger pos = (caret >= 0) ? MIN(caret, (NSInteger)clean.length) : (NSInteger)clean.length;
  UITextPosition *p = [_textField positionFromPosition:_textField.beginningOfDocument offset:pos];
  if (p) {
    _textField.selectedTextRange = [_textField textRangeFromPosition:p toPosition:p];
  }
}

// Build the current text with the sentinel inserted at the caret.
- (NSString *)textWithCursor
{
  NSString *text = _textField.text ?: @"";
  NSInteger caret = text.length;
  UITextRange *sel = _textField.selectedTextRange;
  if (sel) {
    caret = [_textField offsetFromPosition:_textField.beginningOfDocument toPosition:sel.start];
  }
  caret = MAX(0, MIN(caret, (NSInteger)text.length));
  NSString *marker = [NSString stringWithCharacters:&kCursorSentinel length:1];
  return [NSString stringWithFormat:@"%@%@%@",
          [text substringToIndex:caret], marker, [text substringFromIndex:caret]];
}

- (void)textFieldDidChange
{
  if (_applyingFromProps) {
    return;
  }
  if (_uppercase) {
    NSString *up = [_textField.text uppercaseString];
    if (![up isEqualToString:_textField.text]) {
      // Capture the caret as an integer offset, not a UITextRange: setting .text
      // invalidates UITextPosition objects, so reusing the old range would strand
      // the caret at the end. The offset stays valid across the in-place edit.
      UITextPosition *start = _textField.selectedTextRange.start;
      NSInteger caret = start ? [_textField offsetFromPosition:_textField.beginningOfDocument toPosition:start]
                              : (NSInteger)up.length;
      _textField.text = up;
      caret = MIN(caret, (NSInteger)up.length);
      UITextPosition *pos = [_textField positionFromPosition:_textField.beginningOfDocument offset:caret];
      if (pos) {
        _textField.selectedTextRange = [_textField textRangeFromPosition:pos toPosition:pos];
      }
    }
  }

  _eventCount += 1;
  if (auto emitter = [self enhancedEventEmitter]) {
    emitter->onChangeWithCursor({
      .text = RCTStringFromNSString([self textWithCursor]),
      .eventCount = (int)_eventCount,
    });
  }
}

#pragma mark - Key events

- (BOOL)textField:(UITextField *)textField
    shouldChangeCharactersInRange:(NSRange)range
                replacementString:(NSString *)string
{
  if ([string isEqualToString:@" "] && _spaceNavigates) {
    [self emitKey:H2kKeySpace];
    return NO; // swallow; JS decides what a space means
  }
  return YES;
}

- (void)h2kTextFieldDidPressTab
{
  [self emitKey:H2kKeyTab];
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField
{
  [self emitKey:H2kKeySubmit];
  return NO; // keep the keyboard up (mirrors blurOnSubmit={false})
}

- (void)textFieldDidBeginEditing:(UITextField *)textField
{
  if (auto emitter = [self enhancedEventEmitter]) {
    emitter->onFocusChange({ .focused = true });
  }
}

- (void)textFieldDidEndEditing:(UITextField *)textField
{
  if (auto emitter = [self enhancedEventEmitter]) {
    emitter->onFocusChange({ .focused = false });
  }
}

typedef NS_ENUM(NSInteger, H2kKey) { H2kKeySpace, H2kKeyTab, H2kKeySubmit };

- (void)emitKey:(H2kKey)key
{
  auto emitter = [self enhancedEventEmitter];
  if (!emitter) {
    return;
  }
  switch (key) {
    case H2kKeySpace:  emitter->onSpacePressed({ .eventCount = (int)_eventCount }); break;
    case H2kKeyTab:    emitter->onTabPressed({ .eventCount = (int)_eventCount }); break;
    case H2kKeySubmit: emitter->onSubmitPressed({ .eventCount = (int)_eventCount }); break;
  }
}

- (std::shared_ptr<const H2kNativeTextInputEventEmitter>)enhancedEventEmitter
{
  if (!_eventEmitter) {
    return nullptr;
  }
  return std::static_pointer_cast<const H2kNativeTextInputEventEmitter>(_eventEmitter);
}

#pragma mark - Commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTH2kNativeTextInputHandleCommand(self, commandName, args);
}

- (void)insertAtCursor:(NSString *)value
{
  UITextRange *sel = _textField.selectedTextRange;
  if (!sel) {
    UITextPosition *end = _textField.endOfDocument;
    sel = [_textField textRangeFromPosition:end toPosition:end];
  }
  [_textField replaceRange:sel withText:value ?: @""];
  [self textFieldDidChange];
}

- (void)focus
{
  [_textField becomeFirstResponder];
}

- (void)blur
{
  [_textField resignFirstResponder];
}

@end

#pragma mark - Registration

Class<RCTComponentViewProtocol> H2kNativeTextInputCls(void)
{
  return H2kNativeTextInputComponentView.class;
}
