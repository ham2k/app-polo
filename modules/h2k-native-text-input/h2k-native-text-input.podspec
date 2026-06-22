# Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
# SPDX-License-Identifier: MPL-2.0

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name            = "h2k-native-text-input"
  s.version         = package["version"]
  s.summary         = package["description"]
  s.homepage        = "https://ham2k.com"
  s.license         = package["license"]
  s.authors         = "Sebastian Delmont <sd@ham2k.com>"
  s.platforms       = { :ios => "15.5" }
  s.source          = { :git => "https://github.com/ham2k/app-polo.git", :tag => "#{s.version}" }

  s.source_files    = "ios/**/*.{h,m,mm,swift}"

  # Pulls in React-Core, Fabric, generated codegen sources, etc., and wires up
  # this component as a New Architecture Fabric component.
  install_modules_dependencies(s)
end
