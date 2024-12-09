require 'bundler/setup'
require 'dotenv/tasks'
require 'json'
require 'net/http'
require 'uri'


namespace :release do
  task :bleeding => :dotenv do
    release_info = get_release_info
    appcenter_push_release(deployment: 'Development', platform: 'android', version: release_info[:version])
    appcenter_push_release(deployment: 'Development', platform: 'ios', version: release_info[:version])

    system "git tag -a #{release_version}-bundle-bleeding"
  end

  task :unstable => :dotenv do
    release_info = get_release_info
    appcenter_push_release(deployment: 'Staging', platform: 'android', version: release_info[:version])
    appcenter_push_release(deployment: 'Staging', platform: 'ios', version: release_info[:version])
    appcenter_promote_release(from: 'Staging', to: 'Development', platform: 'android')
    appcenter_promote_release(from: 'Staging', to: 'Development', platform: 'ios')

    system "git tag -a #{release_version}-bundle-unstable"
  end

  task :unstable_only => :dotenv do
    release_info = get_release_info
    appcenter_push_release(deployment: 'Staging', platform: 'android', version: release_info[:version])
    appcenter_push_release(deployment: 'Staging', platform: 'ios', version: release_info[:version])

    system "git tag -a #{release_version}-bundle-unstable"
  end

  task :promote_unstable => :dotenv do
    appcenter_promote_release(from: 'Staging', to: 'Development', platform: 'android')
    appcenter_promote_release(from: 'Staging', to: 'Development', platform: 'ios')
    appcenter_promote_release(from: 'Staging', to: 'Stable', platform: 'android')
    appcenter_promote_release(from: 'Staging', to: 'Stable', platform: 'ios')
  end

  task :stable => :dotenv do
    release_info = get_release_info
    appcenter_push_release(deployment: 'Production', platform: 'android', version: release_info[:version])
    appcenter_push_release(deployment: 'Production', platform: 'ios', version: release_info[:version])
    appcenter_promote_release(from: 'Production', to: 'Development', platform: 'android')
    appcenter_promote_release(from: 'Production', to: 'Development', platform: 'ios')
    appcenter_promote_release(from: 'Production', to: 'Staging', platform: 'android')
    appcenter_promote_release(from: 'Production', to: 'Staging', platform: 'ios')

    system "git tag -a #{release_version}-bundle-stable"
  end

  task :list => :dotenv do
    system "appcenter codepush deployment list -a Ham2K/polo-android"
    system "appcenter codepush deployment list -a Ham2K/polo-ios"
  end

  task :discord => :dotenv do
    release_description = get_release_info[:markdown]

    uri = URI.parse(ENV['DISCORD_WEBHOOK_URL'])
    header = {'Content-Type': 'application/json'}
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    request = Net::HTTP::Post.new(uri.request_uri, header)
    request.body = {content: release_description}.to_json

    response = http.request(request)
  end

  task :forums => :dotenv do
    release_info = get_release_info
    release_version = release_info[:version]
    release_version_name = release_info[:version_name]
    release_notes = release_info[:changes]

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

  def appcenter_push_release(deployment:, platform:, version:)
    puts "Pushing #{version} for #{platform} #{deployment}"
    system "appcenter codepush release-react -a Ham2K/polo-#{platform} -d #{deployment} -t $POLO_BASE_VERSION --description \"Release #{version}*\""
  end

  def appcenter_get_latest_release(deployment:, platform:)
    JSON.parse(`appcenter codepush deployment list -a Ham2K/polo-#{platform} --output json`)
        .find { |d| d["deployment"]["name"] == deployment }["deployment"]["latestRelease"]
  end

  def appcenter_promote_release(from:, to:, platform:)
    latest_release = appcenter_get_latest_release(deployment: from, platform: platform)
    puts "Promoting #{latest_release["label"]} to #{platform} #{latest_release["description"]}"
    system "appcenter codepush promote -a Ham2K/polo-#{platform} -s #{from} -d #{to} -t $POLO_BASE_VERSION -r 100 -l #{latest_release["label"]}"
  end


  def get_release_info
    packageJSON = JSON.parse(File.read('package.json'))
    version = packageJSON['version']
    version_name = packageJSON['versionName']
    all_release_notes = JSON.parse(File.read('RELEASE-NOTES.json'))

    if all_release_notes[version].nil?
      puts "No release notes found for #{release_version}"
      exit 1
    end

    changes = all_release_notes[version]['changes']

    markdown = <<~EOF
      # Release #{version}

      #{changes.map { |note| "- #{note}" }.join("\n")}
    EOF

    return { version:, version_name:, markdown:, changes: }
  end
end
