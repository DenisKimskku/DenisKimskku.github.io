# Upload Instructions for calendar++ v1.1 Release

## Files to Upload

All files in this directory should be uploaded to `https://deniskim1.com/releases/`

### Release Files

1. **calendar++-v1.1.zip** (276 KB)
   - Main application bundle
   - SHA256: `fdaee07e195eb08820d292b1b65dc84859d6669519eca439b0d4604a3ad1ed93`
   - Upload to: `https://deniskim1.com/releases/calendar++-v1.1.zip`

2. **RELEASE_NOTES_v1.1.md** (4.0 KB)
   - Release notes for version 1.1
   - Upload to: `https://deniskim1.com/releases/RELEASE_NOTES_v1.1.md`

3. **GOOGLE_CALENDAR_SETUP_GUIDE.md** (4.8 KB)
   - Setup guide for Google Calendar integration
   - Upload to: `https://deniskim1.com/releases/GOOGLE_CALENDAR_SETUP_GUIDE.md`

4. **SHA256SUMS.txt** (86 B)
   - SHA256 checksum for verification
   - Upload to: `https://deniskim1.com/releases/SHA256SUMS.txt`

## Homebrew Formula Update

The Homebrew formula has been updated in the repository at:
- `homebrew-tap/Casks/calendar-plus-plus.rb`

### To publish the Homebrew update:

1. Ensure all files are uploaded to `https://deniskim1.com/releases/`
2. Test the download URL: `https://deniskim1.com/releases/calendar++-v1.1.zip`
3. Commit and push the updated Homebrew formula:

```bash
cd homebrew-tap
git add Casks/calendar-plus-plus.rb
git commit -m "Update calendar++ to v1.1 - Google Calendar integration"
git push origin main
```

## Verification Steps

After uploading, verify:

1. **Download works**:
   ```bash
   curl -I https://deniskim1.com/releases/calendar++-v1.1.zip
   ```
   Should return `200 OK`

2. **SHA256 matches**:
   ```bash
   curl -O https://deniskim1.com/releases/calendar++-v1.1.zip
   shasum -a 256 calendar++-v1.1.zip
   ```
   Should match: `fdaee07e195eb08820d292b1b65dc84859d6669519eca439b0d4604a3ad1ed93`

3. **Homebrew installation works**:
   ```bash
   brew tap deniskim1/tap
   brew install calendar++
   ```

## What's New in v1.1

- Google Calendar integration with OAuth 2.0
- Fixed calendar permissions
- Improved event display
- Enhanced settings UI

## Support

For issues or questions:
- GitHub: https://github.com/deniskim1/calendar++
- Website: https://deniskim1.com

---

Release prepared: December 21, 2025
