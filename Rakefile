require 'bundler/setup'
require 'dotenv/tasks'
require 'json'


task :staging => :dotenv do
  release_version = JSON.parse(File.read('package.json'))['version']
  release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))[release_version]['changes']

  release_description = <<-EOF
# Release #{release_version} (Supplemental)"

#{release_notes.map { |note| "- #{note}" }.join("\n")}
EOF

  puts "Releasing #{release_version} bundle to Staging in AppCenter"
  puts "=================================================================="
  cmd = "appcenter codepush release-react -a Ham2K/polo-android -d Staging -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
  puts "$ #{cmd}"
  system cmd

  cmd = "appcenter codepush release-react -a Ham2K/polo-ios -d Staging -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
  puts "$ #{cmd}"
  system cmd

  cmd = "git tag -a #{release_version}-bundle -m 'Release #{release_version}'"
  puts "$ #{cmd}"
  system cmd
  puts "=================================================================="
  puts ""
  puts release_description
  puts ""

end

task :development => :dotenv do
  release_version = JSON.parse(File.read('package.json'))['version']
  system "appcenter codepush release-react -a Ham2K/polo-android -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
  system "appcenter codepush release-react -a Ham2K/polo-ios -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
end
