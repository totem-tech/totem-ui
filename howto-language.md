# How to generate translations and use

1. Open https://localhost/?build-translation-list=true or https://dev.totem.live/?build-translation-list=true in a browser. Not allowed from `https://totem.live`. Make sure the relevant messaging service's start script has the following environment variable:
```
    BuildMode="TRUE"
```
2. Navigate to `Settings` on sidebar.
3. Click on `Download applications texts as CSV for translation` button to download a CSV file.
4. Upload the downloaded CSV file to Google Drive.
5. Open the uploaded file using Google Sheets.
6. Wait for all texts translations to complete. (Hint: no `loading...` texts)
7. At this stage, correct any translation error or if do manual translation by third party here. Just make sure that headers with language codes are untouched.
8. Download the sheet as Tab Separated Value (TSV) file. DO NOT USE .csv here.
9. Open the downloaded .tsv file in a text editior and copy all texts.
10. Go back to web page opened in (1) and navigate to `Settings`.
11. Paste all texts exactly as is into the text area below the title `Convert TSV to JSON for use with Totem Messaging Service`.
12. Click `Download JSON` to download a .json file.
13. Copy the JSON file to the `Totem Messaging Service`'s data directory. (Hint: look at the `STORAGE_PATH` environment variable in your `.sh` start script)
14. Restart `Totem Messaging Service` and voila! You have got multi-lingual support!

# Update/add/remove language(s) or text(s)
1. To add/remove language support is to be added update the `languages` variable in Totem UI's `src/services/language` file. Make sure to put correct language code as key. Otherwise, got to next step. 
2. Follow the steps from the above section.
3. Nothing else to do :) Totem messaging service and frontend will take care of updading texts to latest version of texts automatically (syncs on page load).

