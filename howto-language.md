# How to generate translations and use

1. Open https://localhost/?build-mode=true or https://dev.totem.live/?build-mode=true in a browser. Not allowed from `https://totem.live`. Make sure the relevant messaging service's start script has the following environment variable:
```
    BuildMode="TRUE"
```
2. Navigate to `Settings` on sidebar.
3. Select action from Dropdown: `Download a list of all texts for translation`
4. Click on `Download File` button to download a CSV file.
5. Upload the downloaded CSV file to Google Drive.
6. Open the uploaded file using Google Sheets. 
7. Check column number 2 and add `=` prefix if a formula is shown on any of the cells.
8. Wait for all texts translations to complete. (Hint: no `loading...` texts)
9. At this stage, correct any translation error or if do manual translation by third party here. Just make sure that headers with language codes are untouched.
10. Download the sheet as Tab Separated Value (TSV) file. DO NOT USE .csv here.
11. Repeat step (1) and (2)
12. Select action from Dropdown: `Convert translations.tsv to translations.json`
13. Click `Download File` to download a .json file.
14. Copy the JSON file to the `Totem Messaging Service`'s data directory. (Hint: look at the `STORAGE_PATH` environment variable in your `.sh` start script)
15. Restart `Totem Messaging Service` and voila! You have got multi-lingual support!

# Update/add/remove language(s) or text(s)
1. To add/remove language support, update the `languages` variable in Totem UI's `src/utils/languageHelper.js` file. Make sure to put correct language code as key.
2. Follow the steps from the above section to apply the changes.
3. Totem messaging service and frontend will take care of updating translated texts to latest version to the client-side.

