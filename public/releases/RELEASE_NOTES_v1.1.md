# calendar++ v1.1 Release Notes

Released: December 21, 2025

## What's New in v1.1

### Google Calendar Integration
- **OAuth 2.0 Authentication**: Securely sign in with your Google account using OAuth 2.0 with PKCE
- **Sync Google Calendar Events**: View your Google Calendar events alongside your local macOS Calendar events
- **Automatic Token Refresh**: Access tokens are automatically refreshed in the background
- **Secure Credential Storage**: All Google credentials are securely stored in macOS Keychain
- **Google Calendar Settings**: New settings panel to manage your Google Calendar connection
- **Event Merging**: Google Calendar events are seamlessly merged with your local events in the agenda view

### Calendar Permissions Fixed
- **Proper Permission Requests**: The app now properly requests calendar and reminder access on first launch
- **Calendar Event Display**: Local Calendar app events now display correctly in the app
- **Bundle Identifier Fix**: Added missing CFBundleIdentifier to Info.plist for proper app identification

### User Interface Improvements
- **Google Calendar Tab**: New settings tab for managing Google Calendar integration
- **Connection Status**: View your Google Calendar connection status in settings
- **Sign In/Out**: Easy-to-use sign in and sign out buttons for Google Calendar

## How to Use Google Calendar

### Setting Up Google Calendar (One-time Setup)

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Google Calendar API

2. **Create OAuth Credentials**
   - Create OAuth 2.0 credentials (Desktop app type)
   - Copy the Client ID

3. **Update the App**
   - Open `calendar++/GoogleCalendarManager.swift`
   - Replace `YOUR_CLIENT_ID` on line 60 with your actual Client ID
   - Rebuild the app

4. **Sign In**
   - Click the calendar++ icon in your menu bar
   - Open Settings
   - Go to the "Google Calendar" tab
   - Click "Sign In with Google"
   - Authorize calendar++ to access your Google Calendar

For detailed setup instructions, see `GOOGLE_CALENDAR_SETUP_GUIDE.md` included with the source code.

### Using the App

Once set up, calendar++ will:
- Show both local Calendar app events and Google Calendar events
- Color-code events by calendar
- Update events automatically
- Refresh Google Calendar events when you open the menu bar popup

## Technical Details

### Files Modified
- `calendar__App.swift` - Added GoogleCalendarManager integration
- `EventKitManager.swift` - Added Google events merging
- `MenuBarRootView.swift` - Added Google Calendar sync
- `PreferencesView.swift` - Added Google Calendar settings tab
- `CalendarModels.swift` - Made EventSummary Equatable
- `Info.plist` - Added CFBundleIdentifier and calendar permissions

### Files Created
- `GoogleCalendarManager.swift` - Complete Google Calendar API integration
- `GoogleCalendarSettingsView.swift` - Google Calendar settings UI

## Download

- **File**: calendar++-v1.1.zip
- **Size**: 276 KB
- **SHA256**: `fdaee07e195eb08820d292b1b65dc84859d6669519eca439b0d4604a3ad1ed93`

## Installation

### Via Homebrew (Recommended)
```bash
brew tap deniskim1/tap
brew install calendar++
```

### Manual Installation
1. Download `calendar++-v1.1.zip`
2. Unzip the file
3. Move `calendar++.app` to your Applications folder
4. Launch the app
5. Grant calendar permissions when prompted

## System Requirements

- macOS 13.0 or later
- Calendar app permissions
- (Optional) Google account for Google Calendar integration

## Known Issues

- Google Calendar integration requires manual setup with Google Cloud Console
- First launch may take a few seconds while requesting permissions

## Upgrade from v1.0

If you're upgrading from v1.0:
1. Quit the old version of calendar++
2. Replace the old app with the new version
3. Launch the new version
4. Grant calendar permissions if prompted
5. (Optional) Set up Google Calendar integration

---

For issues or feature requests, please visit: https://github.com/deniskim1/calendar++

Enjoy your enhanced calendar experience!
