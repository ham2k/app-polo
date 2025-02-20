require 'bundler/setup'
require 'dotenv/tasks'
require 'json'
require 'net/http'
require 'uri'


namespace :release do
  task :bleeding => :dotenv do
    release_info = get_release_info
    revopush_push_release(deployment: 'Development', platform: 'android', version: release_info[:version])
    revopush_push_release(deployment: 'Development', platform: 'ios', version: release_info[:version])

    system "git tag -a #{release_info[:version]}-bundle-bleeding -m ''"
  end

  task :unstable => :dotenv do
    release_info = get_release_info
    revopush_push_release(deployment: 'Staging', platform: 'android', version: release_info[:version])
    revopush_push_release(deployment: 'Staging', platform: 'ios', version: release_info[:version])
    revopush_promote_release(from: 'Staging', to: 'Development', platform: 'android')
    revopush_promote_release(from: 'Staging', to: 'Development', platform: 'ios')

    system "git tag -a #{release_info[:version]}-bundle-unstable -m ''"
  end

  task :unstable_only => :dotenv do
    release_info = get_release_info
    revopush_push_release(deployment: 'Staging', platform: 'android', version: release_info[:version])
    revopush_push_release(deployment: 'Staging', platform: 'ios', version: release_info[:version])

    system "git tag -a #{release_info[:version]}-bundle-unstable -m ''"
  end

  task :promote_unstable => :dotenv do
    revopush_promote_release(from: 'Staging', to: 'Development', platform: 'android')
    revopush_promote_release(from: 'Staging', to: 'Development', platform: 'ios')
    revopush_promote_release(from: 'Staging', to: 'Stable', platform: 'android')
    revopush_promote_release(from: 'Staging', to: 'Stable', platform: 'ios')
  end

  task :stable => :dotenv do
    release_info = get_release_info
    revopush_push_release(deployment: 'Production', platform: 'android', version: release_info[:version])
    revopush_push_release(deployment: 'Production', platform: 'ios', version: release_info[:version])
    revopush_promote_release(from: 'Production', to: 'Development', platform: 'android')
    revopush_promote_release(from: 'Production', to: 'Development', platform: 'ios')
    revopush_promote_release(from: 'Production', to: 'Staging', platform: 'android')
    revopush_promote_release(from: 'Production', to: 'Staging', platform: 'ios')

    system "git tag -a #{release_info[:version]}-bundle-stable -m ''"
  end

  task :list => :dotenv do
    system "revopush deployment list -a polo-android"
    system "revopush deployment list -a polo-ios"
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

  def revopush_push_release(deployment:, platform:, version:)
    puts "Pushing #{version} for #{platform} #{deployment}"
    cmd = "revopush release-react polo-#{platform} #{platform} -d #{deployment} --targetBinaryVersion #{ENV['POLO_BASE_VERSION']} --description \"Release #{version}\""
    puts "$ #{cmd}"
    system cmd
  end

  def revopush_get_latest_release(deployment:, platform:)
    JSON.parse(`revopush deployment list polo-#{platform} --format json`)
        .find { |d| d["name"] == deployment }["package"]["label"]
  end

  def revopush_promote_release(from:, to:, platform:)
    latest_release = revopush_get_latest_release(deployment: from, platform: platform)
    puts "Promoting #{latest_release["label"]} to #{platform} #{latest_release["description"]}"
    system "revopush promote polo-#{platform} #{from} #{to} --targetBinaryVersion #{ENV['POLO_BASE_VERSION']} -r 100 -l #{latest_release["label"]}"
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
