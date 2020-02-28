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
7. Wait for all texts translations to complete. (Hint: no `loading...` texts)
8. At this stage, correct any translation error or if do manual translation by third party here. Just make sure that headers with language codes are untouched.
9. Download the sheet as Tab Separated Value (TSV) file. DO NOT USE .csv here.
10. Repeat step (1) and (2)
11. Select action from Dropdown: `Convert translations.tsv to translations.json`
12. Click `Download File` to download a .json file.
13. Copy the JSON file to the `Totem Messaging Service`'s data directory. (Hint: look at the `STORAGE_PATH` environment variable in your `.sh` start script)
14. Restart `Totem Messaging Service` and voila! You have got multi-lingual support!

# Update/add/remove language(s) or text(s)
1. To add/remove language support is to be added update the `languages` variable in Totem UI's `src/services/language` file. Make sure to put correct language code as key. Otherwise, got to next step. 
2. Follow the steps from the above section.
3. Nothing else to do :) Totem messaging service and frontend will take care of updading texts to latest version of texts automatically (syncs on page load).

