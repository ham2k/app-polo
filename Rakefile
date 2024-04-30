require 'bundler/setup'
require 'dotenv/tasks'
require 'json'
require 'net/http'
require 'uri'


namespace :release do
  task :bleeding => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    system "appcenter codepush release-react -a Ham2K/polo-android -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version} 🔪🩸\""
    system "appcenter codepush release-react -a Ham2K/polo-ios -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version} 🔪🩸\""
  end

  task :unstable => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))[release_version]['changes']

    release_description = <<-EOF
  # Release #{release_version} (Supplemental)

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
    puts "You need to be on the unstable track to test this.  (enter \"konami\" on any operation log, and then use Developer Settings to change your release track)"
  end

  task :stable => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']

    system "appcenter codepush release-react -a Ham2K/polo-android -d Production -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
    system "appcenter codepush release-react -a Ham2K/polo-android -d Production -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
  end

  task :promote => :dotenv do
    system "appcenter codepush promote -a Ham2K/polo-android -s Staging -d Production -t $POLO_BASE_VERSION -r 100"
    system "appcenter codepush promote -a Ham2K/polo-ios -s Staging -d Production -t $POLO_BASE_VERSION -r 100"
  end

  task :discord => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))[release_version]['changes']

    release_description = <<-EOF
  # Release #{release_version} (Supplemental)

  #{release_notes.map { |note| "- #{note}" }.join("\n")}
  EOF

    uri = URI.parse(ENV['DISCORD_WEBHOOK_URL'])
    header = {'Content-Type': 'application/json'}
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    request = Net::HTTP::Post.new(uri.request_uri, header)
    request.body = {content: release_description}.to_json

    response = http.request(request)
  end
end
