# Instagram Block List Chrome Extension

Instagram Block List is a Chrome extension designed to simplify the process of managing your Instagram account's block list. With this extension, users can import block lists from local files or URLs, automatically blocking accounts listed within. The extension allows for easy management of block lists, including viewing imported lists, reviewing blocked accounts, and exporting combined lists for sharing or backup purposes. Additionally, users can revert blocks by removing block lists and utilize a Block List Builder to create custom block lists based on their interactions on Instagram. All data is persistent and stored locally in the browser for seamless usage.

## Technologies Used

<code><a href="https://react.dev/"><img width="50" src="https://user-images.githubusercontent.com/25181517/183897015-94a058a6-b86e-4e42-a37f-bf92061753e5.png" alt="React" title="React"/></a></code>
<code><a href="https://www.typescriptlang.org/"><img width="50" src="https://user-images.githubusercontent.com/25181517/183890598-19a0ac2d-e88a-4005-a8df-1ee36782fde1.png" alt="TypeScript" title="TypeScript"/></a></code>
<code><a href="https://vitejs.dev/"><img width="50" src="https://github-production-user-asset-6210df.s3.amazonaws.com/62091613/261395532-b40892ef-efb8-4b0e-a6b5-d1cfc2f3fc35.png" alt="Vite" title="Vite"/></a></code>

This project was bootstrapped with [Vite](https://vitejs.dev/) using [CRXJS](https://crxjs.dev/vite-plugin/) Vite Plugin, a tool to polish and optimize Chrome Extensions development.

## Installation

1. Download the latest release from the [releases page]()
2. Unzip the file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable Developer Mode
5. Click "Load Unpacked" and select the unzipped folder

## Features

### **Importing Block Lists**:

- Click on the extension icon in the Chrome toolbar to open the popup.
- Navigate to the "Import" tab.
- Choose to import block lists from local .txt files or hosted URLs.
- Upon import, the extension will automatically block accounts listed in the imported lists.

### **Managing Block Lists**:

- Access imported block lists from the "Lists" tab in the extension popup.
- View imported lists and review blocked accounts.
- Combine and export block lists into a single text file for sharing or backup.

### **Reverting Blocks**:

- To revert blocks, navigate to the "Lists" tab in the extension popup.
- Remove imported block lists to undo the blocking action for accounts listed within.

### **Block List Builder**:

- Utilize the Block List Builder to create custom block lists.
- Visit an Instagram page and click on the "Add Current User" button in the Chrome toolbar.
- The extension will automatically extract and store user information for listing.
- Export the created block list with a title and description.

### **Data Persistence and Sync**:

- All extension data, including block lists and settings, are persistent and stored locally in the browser.

Start managing your Instagram block lists more efficiently with Instagram Block List Chrome Extension!

## Documentation

- [Block Lists Structure](docs/BLOCK_LISTS.md) - Learn how is structured a block list file.

## Bugs and Feature Requests

Have a bug or a feature request? Please first search for [existing and closed issues](https://github.com/AntoninJuquel/instagram-blocklist-extension/issues). If your problem or idea is not addressed yet, please open a new issue.

## Contributors

<table>
    <tr>
        <td align="center">
            <a href="https://github.com/AntoninJuquel">
                <img src="https://github.com/AntoninJuquel.png" width="100px;" alt="AntoninJuquel"/>
                </br>
                <sub><b>AntoninJuquel</b></sub>
            </a>
        <td>
        <td align="center">
            <a href="https://github.com/RajPorus19">
                <img src="https://github.com/RajPorus19.png" width="100px;" alt="RajPorus19"/>
                </br>
                <sub><b>RajPorus19</b></sub>
            </a>
        <td>
    </tr>
</table>

## License

Code released under the [MIT License](http://choosealicense.com/licenses/mit/).
