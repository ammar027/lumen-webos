# Native Home selection

Lumen can use the native Home button route on some webOS versions.
The app manifest must contain `"appCategory": ["home"]`.
This field makes Lumen available for selection.
It does not change the default Home app.

The metadata change and this route passed tests on one rooted LG 65UT8000AUA:
firmware 33.31.61, webOS 25, SDK 10.3.1.
The tests included a restart, the physical Home button, and restoration of LG Home.
No Home redirect watcher was active during these tests.
Other models and firmware versions need separate tests.

## Before you start

**CAUTION:** An incorrect default Home app can stop the Home button from working.
Keep LG Home installed.
Keep root shell access available until you complete the restoration test.

- Use a package that contains the new category. The v1.0.9 release does not contain it.
- Open Lumen normally to check that the app works.
- Use an interactive root shell on the TV for the commands below.
- Keep standard input open. Do not redirect input from `/dev/null`.
- Check each JSON response for `"returnValue": true`.
- If a command fails or gives no response, stop. Do not repeat a change without a status check.
- Do not edit LG system files or add `requiredPermissions: ["all"]`.

These commands use firmware-specific APIs.
An accepted `setDefaultApp` response alone does not prove that Home works.

## Check the registered apps

1. Read the registered Lumen metadata.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/getAppInfo '{"id":"com.ammar027.lumen","properties":["id","version","appCategory"]}'
   ```

   The `appInfo.appCategory` array must contain `home`.
   If it does not, stop before you change the default.
   Check the installed package and app registration first.

2. Check that LG Home is available.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/getAppInfo '{"id":"com.webos.app.home","properties":["id","appCategory"]}'
   ```

   Its category array must also contain `home`.

3. Read the current default apps.

   ```sh
   luna-send -n 1 luna://com.webos.settingsservice/getSystemSettings '{"category":"general","keys":["defaultApps"]}'
   ```

   Save the full response on your computer.
   Use it to check that unrelated categories do not change.

4. Disable the startup task for any Home redirect watcher.
5. Stop its active process with the stop method for that installation.
6. Check that no redirect watcher remains active.

   Keep its files for recovery.
   If you cannot stop it safely, do not continue.
   The supplied `tools/tv/watch.sh` also handles other functions.
   Those functions stop with that watcher.

7. Complete **Restore LG Home** below before you select Lumen.

   This checks the recovery route on your firmware.

## Select Lumen

1. Set only the Home category.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.ammar027.lumen"}'
   ```

2. Repeat the default-app read command from the previous section.

   Check that `settings.defaultApps.home` is `com.ammar027.lumen`.
   Check that all unrelated entries match the saved response.

3. Test the native Home route.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/launchDefaultApp '{"category":"home"}'
   ```

4. Check the foreground app.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/getForegroundAppInfo '{}'
   ```

   The `appId` must be `com.ammar027.lumen`.
   Check that Lumen stays on the screen.

5. Test the physical Home button from an HDMI input.
6. Complete **Restore LG Home** to test recovery after the change.
7. If recovery succeeds, repeat steps 1 to 5 to select Lumen again.
8. When you are ready, restart the TV.
9. Repeat the metadata, default-app, and Home-button checks after the restart.

   Keep the redirect watcher disabled.
   Otherwise, a redirect can hide a failed native Home test.
   If a check fails, restore LG Home.

## Restore LG Home

1. Set LG Home explicitly.

   ```sh
   luna-send -n 1 luna://com.webos.service.applicationmanager/setDefaultApp '{"category":"home","appId":"com.webos.app.home"}'
   ```

2. Read the default apps with the command above.

   Check that `settings.defaultApps.home` is `com.webos.app.home`.
   Check that unrelated categories did not change.

3. Run the native `launchDefaultApp` command above.
4. Read the foreground app.

   The `appId` must be `com.webos.app.home`.
   Check that LG Home stays on the screen with no redirect watcher.

5. Test the physical Home button.

Do not remove the `home` entry as a restoration method.
An absent entry did not remain absent after a restart on the tested TV.

## Before an update or removal

Before you remove Lumen, restore LG Home.
Before an update, restore LG Home unless the new package retains the Home category.
A package update can replace a local manifest change.
Do not leave the default pointed at an absent or ineligible app.

After restoration, you can enable the previous watcher if you still need it.
Native Home selection does not require a watcher, preload service, or system binary patch.

## Build test

Run this command from the repository root:

```sh
python3 -B -m unittest discover -s tools/test -p 'test_home_category.py' -v
```

The tests run the branding script against temporary app files.
They check category preservation, repeat application, and unchanged permissions.
They do not install an IPK or test a TV.

## API evidence

The tested TV's `ApplicationDescription.schema` identifies `appCategory` as the
category list for `launchDefaultApp`.
Its Home key handler calls `launchDefaultApp` with category `home`.
[OpenLauncher also declares this category](https://github.com/Shantil-K/OpenLauncher/blob/750398a7614563ea0937bb3ccf5f35912183001c/src/appinfo.json).
These observations do not establish support on every webOS version.
