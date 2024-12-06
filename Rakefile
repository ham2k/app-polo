require 'bundler/setup'
require 'dotenv/tasks'
require 'json'
require 'net/http'
require 'uri'


namespace :release do
  task :bleeding => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    system "appcenter codepush release-react -a Ham2K/polo-android -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version}*\""
    system "appcenter codepush release-react -a Ham2K/polo-ios -d Development -t $POLO_BASE_VERSION --description \"Release #{release_version}*\""
  end

  task :unstable => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    all_release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))

    if all_release_notes[release_version].nil?
      puts "No release notes found for #{release_version}"
      exit 1
    end

    release_notes = all_release_notes[release_version]['changes']

    release_description = <<~EOF
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

  task :list => :dotenv do
    system "appcenter codepush deployment list -a Ham2K/polo-android"
    system "appcenter codepush deployment list -a Ham2K/polo-ios"
  end

  task :stable => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']

    system "appcenter codepush release-react -a Ham2K/polo-android -d Production -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
    system "appcenter codepush release-react -a Ham2K/polo-ios -d Production -t $POLO_BASE_VERSION --description \"Release #{release_version}\""
  end

  task :promote_bleeding => :dotenv do
    android_release_data = JSON.parse(`appcenter codepush deployment list -a Ham2K/polo-android --output json`)
    ios_release_data = JSON.parse(`appcenter codepush deployment list -a Ham2K/polo-ios --output json`)
    latest_android_release = android_release_data.find { |d| d["deployment"]["name"] == "Development" }["deployment"]["latestRelease"]
    latest_ios_release = ios_release_data.find { |d| d["deployment"]["name"] == "Development" }["deployment"]["latestRelease"]


    puts "Promoting Android #{latest_android_release["label"]} - #{latest_android_release["description"]}"
    system "appcenter codepush promote -a Ham2K/polo-android -s Development -d Staging -t $POLO_BASE_VERSION -r 100 -l #{latest_android_release["label"]}"
    system "appcenter codepush promote -a Ham2K/polo-android -s Development -d Production -t $POLO_BASE_VERSION -r 100  -l #{latest_android_release["label"]}"

    puts "Promoting iOS #{latest_ios_release["label"]} - #{latest_ios_release["description"]}"
    system "appcenter codepush promote -a Ham2K/polo-ios -s Development -d Staging -t $POLO_BASE_VERSION -r 100 -l #{latest_ios_release["label"]}"
    system "appcenter codepush promote -a Ham2K/polo-ios -s Development -d Production -t $POLO_BASE_VERSION -r 100 -l #{latest_ios_release["label"]}"
  end

  task :promote_unstable => :dotenv do
    android_release_data = JSON.parse(`appcenter codepush deployment list -a Ham2K/polo-android --output json`)
    ios_release_data = JSON.parse(`appcenter codepush deployment list -a Ham2K/polo-ios --output json`)
    latest_android_release = android_release_data.find { |d| d["deployment"]["name"] == "Staging" }["deployment"]["latestRelease"]
    latest_ios_release = ios_release_data.find { |d| d["deployment"]["name"] == "Staging" }["deployment"]["latestRelease"]

    puts "Promoting Android #{latest_android_release["label"]} - #{latest_android_release["description"]}"
    system "appcenter codepush promote -a Ham2K/polo-android -s Staging -d Development -t $POLO_BASE_VERSION -r 100 -l #{latest_android_release["label"]}"
    system "appcenter codepush promote -a Ham2K/polo-android -s Staging -d Production -t $POLO_BASE_VERSION -r 100 -l #{latest_android_release["label"]}"

    puts "Promoting iOS #{latest_ios_release["label"]} - #{latest_ios_release["description"]}"
    system "appcenter codepush promote -a Ham2K/polo-ios -s Staging -d Development -t $POLO_BASE_VERSION -r 100 -l #{latest_ios_release["label"]}"
    system "appcenter codepush promote -a Ham2K/polo-ios -s Staging -d Production -t $POLO_BASE_VERSION -r 100 -l #{latest_ios_release["label"]}"
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


  task :forums => :dotenv do
    release_version = JSON.parse(File.read('package.json'))['version']
    release_version_name = JSON.parse(File.read('package.json'))['versionName']
    release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))[release_version]['changes']

    if release_version =~ /\.99/
      release_track = "Test"
    else
      release_track = "Official"
    end

    if release_version =~ /\.0$/ || release_version =~ /-pre0/
      release_mode = "Major Release"
    else
      release_mode = "Supplemental"
    end

    release_description = <<-EOF
### #{release_version_name} - #{release_mode} `#{release_version}`

#{release_notes.map { |note| "- #{note}" }.join("\n")}

EOF

    if release_mode == "Major Release" && release_track == "Official"
    release_description += <<-EOF
Upgrade through your device's app store.
EOF
    elsif release_mode == "Supplemental" && release_track == "Official"
    release_description += <<-EOF
Direct update inside the app. Look for a notification or go to the Settings Screen and check there.
EOF
    elsif release_mode == "Major Release" && release_track == "Test"
    release_description += <<-EOF
Upgrade through the Test Program channels (Google Play on Android, TestFlight on iOS).
EOF
    elsif release_mode == "Supplemental" && release_track == "Test"
    release_description += <<-EOF
Direct update inside the app. Look for a notification or go to the Settings Screen and check there.
EOF
    end


    puts "---------------------"
    puts release_description
    puts "---------------------"

    # uri = URI.parse(ENV['DISCORD_WEBHOOK_URL'])
    # header = {'Content-Type': 'application/json'}
    # http = Net::HTTP.new(uri.host, uri.port)
    # http.use_ssl = true
    # request = Net::HTTP::Post.new(uri.request_uri, header)
    # request.body = {content: release_description}.to_json

    # response = http.request(request)
  end
end
