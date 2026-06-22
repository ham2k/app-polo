// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

#import <UIKit/UIKit.h>
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

// Fabric component view for <H2kNativeTextInput>. The class name must be
// "<ComponentName>ComponentView" so codegen's generated component registry
// (RCTThirdPartyComponentsProvider) can auto-discover it.
@interface H2kNativeTextInputComponentView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
