var loadingPage = true;
var limitToCurrentLanguage = false;

// Load before showing the page
function loadGeneralPageStuff() {
    // Color Theme
    if (localStorage.getItem("darkMode") === "true") {
        document.documentElement.classList.add("dark");
        get("colorThemeSwitch").checked = false;
    }

    // Tabs
    loadTabs();
}

// Load user interaction events that are used on all pages
function loadGeneralUserEvents() {
    // Tab Overflow
    adjustTabsOverflow();

    // Color Theme
    document.getElementsByClassName("onoffswitch")[0].onclick = function () { get("colorThemeSwitch").click(); }

    get("colorThemeSwitch").addEventListener("change", function () {
        if (get("colorThemeSwitch").checked) {
            localStorage.removeItem("darkMode");
            document.documentElement.classList.remove("dark");
        } else {
            localStorage.setItem("darkMode", "true");
            document.documentElement.classList.add("dark");
        }
    });

    // Language
    get("languageMenuDiv").addEventListener("click", event => {
        if (!clickedOn(event, "languageOptions")) {
            get("languageSettingSelect").classList.add("open");
        }
    });

    forEachElement("#languageOptions > div", element => {
        element.addEventListener("click", () => {
            get("languageSettingSelect").classList.remove("open");
            translatePage(element.children[0].innerHTML);
        });
    });

    // Open/Close Menu
    document.addEventListener("click", (event) => {
        if (get("menuButton").classList.contains("open") && !clickedOn(event, "menuDiv") && !clickedOn(event, "menuButton")) {
            get("menuDiv").classList.add("hidden");
            get("menuButton").classList.remove("open");
            get("languageSettingSelect").classList.remove("open");
        }
    });

    get("menuButton").addEventListener("click", function () {
        if (get("menuDiv").classList.toggle("hidden")) {
            get("languageSettingSelect").classList.remove("open");
        }

        this.classList.toggle("open");
    });

    // Nav Links
    // Home Nav Button
    if (!!get("toHome")) {
        get("toHome").addEventListener("click", function () {
            window.location.href = "databaseHome.html";
        });
    }

    // Search Nav Button
    if (!!get("toSongs")) {
        get("toSongs").addEventListener("click", function () {
            clearSearchData();
            promptToSongs(null);
        });
    }

    // New Song
    get("newSongButton").addEventListener("click", event => {
        buildDropdown(event, [
            buildDropdownOption("upload.png", "Upload Song", chooseFile),
            buildDropdownOption("paste.png", "Use Copied Text", newSongFromClipbaord),
            buildDropdownOption("search.png", "Search For Song", () => {
                clearSearchData();
                window.location.href = "databaseSongs.html";
            })
        ]);
    });

    // Tabs Overflow
    setUpTabOverlow();

    // File Upload
    get("file").addEventListener("change", newFiles);

    // Dropping a file onto the page
    document.addEventListener('dragover', function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    document.addEventListener("drop", function (event) {
        event.preventDefault();

        if (event.dataTransfer.files.length === 0) {
            return;
        }

        get("file").files = event.dataTransfer.files;
        newFiles();
    });

    loadSearchEvents();
}


//*****************************
// Tabs
//*****************************
var tabsData;
var currentTab;

// Saves the current tabs data
function saveTabs() {
    sessionStorage.setItem("tabs", JSON.stringify(tabsData));
}

// Refreshes tab elements on screen and sets the songData
function loadTabs() {
    removeChildren(get("tabs"));
    removeChildren(get("moreTabs"));
    tabOverflowStack = [];
    tabsData = JSON.parse(sessionStorage.getItem("tabs"));

    if (!tabsData) {
        tabsData = [];
        return;
    }

    // Build tabs
    tabsData.forEach(tabData => buildTab(tabData));

    // Tab Overflow
    adjustTabsOverflow();
}

function isCurrentTab(tabData) {
    return (pageName === "databaseView") && (tabData.tabId == sessionStorage.getItem("tabIdRequest"));
}

// Builds a tab and appends it to the nav - sets the songData for the current page
function buildTab(tabData) {
    let tabsContainer = get("tabs");

    // Load tab data
    let isCurrentPage = isCurrentTab(tabData);

    // Sav tab data
    if (isCurrentPage) {
        currentTab = tabData;

        if (!!tabData.isPlaylist) {
            usingPlaylist = true;
            playlistData = tabData;
            songData = getSongFromPlaylist(playlistData.currentSongId);
        } else {
            usingPlaylist = false;
            0
            playlistData = null;
            songData = tabData;
        }
    }

    // Tab div - click event
    let tabDiv = make("div");
    tabDiv.classList.add("tab");
    tabDiv.classList.add("navPageLink");
    if (isCurrentPage) {
        tabDiv.classList.add("currentPage");
    } else {
        tabDiv.addEventListener("click", function (event) {
            if (clickedOnClass(event, "tabCloseButton")) {
                return;
            }

            selectTab(tabData.tabId);
            handleNewSong();
        });
    }

    // Tab icon
    let img = make("img");

    if (!!tabData.isPlaylist) {
        img.src = "./imgs/icons/playlist.png";
        img.alt = "Playlist";
    } else {
        img.src = "./imgs/icons/note.png";
        img.alt = "Note";
    }

    tabDiv.appendChild(img);

    // Tab name
    if (!tabData.tabName) {
        tabData.tabName = tabData.songName;
    }

    tabDiv.title = tabData.tabName;

    let nameSpan = make("span");
    nameSpan.classList.add("tabName");
    nameSpan.innerHTML = tabData.tabName;
    tabDiv.appendChild(nameSpan);

    // Close button
    let closeButton = build({
        type: "span",
        classes: [
            "tabCloseButton",
            "smallIconButton"
        ],
        innerHTML: "×"
    });

    tabDiv.appendChild(closeButton);

    closeButton.addEventListener("click", function () {
        if (isInOverflow(tabDiv)) {
            removeFromOverflow(tabDiv.previousSibling);
            removeFromOverflow(tabDiv);
        } else {
            tabDiv.parentElement.removeChild(tabDiv.nextSibling);
            tabDiv.parentElement.removeChild(tabDiv);
        }


        adjustTabsOverflow();
        removeTabData(tabData);

        if (isCurrentPage) {
            clearSelectedTab();

            if (tabsData.length > 0) {
                loadFirstTab();
            } else {
                window.location.href = "databaseHome.html";
            }
        } else if (pageName === "databaseView" && usingPlaylist && !tabData.isPlaylist) {
            if (getOpenSongs().length === 0) {
                get("addToPlaylistContainer").classList.add("hidden");
            }
        }
    });

    // Append tab
    tabsContainer.appendChild(tabDiv);
    tabsContainer.appendChild(make("hr"));
}

// Closes the currently open tab
function closeCurrentTab() {
    let currentTabElement = getFirst(".currentPage");

    if (isInOverflow(currentTabElement)) {
        removeFromOverflow(currentTabElement.previousSibling);
        removeFromOverflow(currentTabElement);
    } else {
        currentTabElement.parentElement.removeChild(currentTabElement.nextSibling);
        currentTabElement.parentElement.removeChild(currentTabElement);
    }

    adjustTabsOverflow();
    removeTabData(currentTab);
    clearSelectedTab();

    if (tabsData.length > 0) {
        loadFirstTab();
    } else {
        window.location.href = "databaseHome.html";
    }
}

// Removes specified tab data from the list
function removeTabData(tabData) {
    const index = tabsData.indexOf(tabData);
    if (index > -1) { // only splice array when item is found
        tabsData.splice(index, 1); // 2nd parameter means remove one item only
        saveTabs();
    }
    return index;
}

// Removes tab from tabsdata, saves, and closes tab
function closeTab(tabData) {
    let index = removeTabData(tabData);
    loadTabs();
}

// Clears the selected tab id from LC
function clearSelectedTab() {
    sessionStorage.removeItem("tabIdRequest");
}

// Selects a tab - does not display it
function selectTab(tabId) {
    sessionStorage.setItem("tabIdRequest", tabId);
}

// Selects and loads a tab
function loadTab(tabId) {
    selectTab(tabId);
    loadTabs();
}

// Loads the first 
function loadFirstTab() {
    selectTab(tabsData[0].tabId);
    usingPlaylist = !!tabsData[0].isPlaylist;
    handleNewSong();
}


//*****************************
// Tab Overflow
//*****************************

// Sets up the events related to tab overflow
function setUpTabOverlow() {
    window.addEventListener("click", event => {
        if (!clickedOn(event, "moreTabsButtonContainer") && !clickedOnClass(event, "tabCloseButton")) {
            get("moreTabs").classList.add("hidden");
        }
    });
    window.addEventListener("resize", adjustTabsOverflow);
    get("moreTabsButton").addEventListener("click", function () {
        get("moreTabs").classList.toggle("hidden");
    });
}

// Move tabs between tab bar and overflow
var tabOverflowStack = [];
function adjustTabsOverflow() {
    const MAX_HEIGHT = 55;
    const underflow = get("tabs");
    const overflow = get("moreTabs");
    const overflowButton = get("moreTabsButtonContainer");

    // Show as many elements as possible
    while (tabOverflowStack.length > 0 && underflow.offsetHeight <= MAX_HEIGHT) {
        for (let i = 0; i < 2; i++) {
            let movingElement = tabOverflowStack.pop();
            overflow.removeChild(movingElement);
            underflow.appendChild(movingElement);
        }
    }

    // Try to hide the overflow button if all elements are shown
    if (tabOverflowStack.length === 0) {
        overflowButton.classList.add("hidden");

        if (underflow.offsetHeight > MAX_HEIGHT) {
            overflowButton.classList.remove("hidden");
        } else {
            overflow.classList.add("hidden");
        }
    }

    // Overflow items as needed
    while (underflow.offsetHeight > MAX_HEIGHT) {
        for (let i = 0; i < 2; i++) {
            let overflowedChild = underflow.children[underflow.children.length - 1];
            tabOverflowStack.push(overflowedChild);
            underflow.removeChild(overflowedChild);
            overflow.appendChild(overflowedChild);
        }
    }
}

// Checks if an element is currently stored in tab overflow
function isInOverflow(tabDiv) {
    return tabDiv.parentElement.id === "moreTabs";
}

// Remove an elemeent from the overflow container and from the stack
function removeFromOverflow(element) {
    element.parentElement.removeChild(element);
    const index = tabOverflowStack.indexOf(element);
    if (index > -1) {
        tabOverflowStack.splice(index, 1);
    }
}


//*****************************
// New Tab
//*****************************

// Saves and loads a new tab without selecting it
function loadNewTab(tabData) {
    saveNewTabData(tabData);
    loadTabs();
}

// Saves tabData to a new tab and selects it
function saveAndSelectNewTab(tabData) {
    saveNewTabData(tabData);
    selectTab(tabData.tabId);
}

// Saves new data to the list, updates the elements, and selects the new tab
function saveNewTabData(tabData) {
    tabData.tabId = generateTabId();
    tabsData.push(tabData);
    saveTabs();
}

// Generates an unused tab id
function generateTabId() {
    let id = 0;

    while (tabIdExists(id)) {
        id++;
    }

    return id;
}

// Checks if a tab Id is in use
function tabIdExists(id) {
    if (!tabsData) {
        return false;
    }

    for (let i = 0; i < tabsData.length; i++) {
        if (tabsData[i].tabId === id) {
            return true;
        }
    }

    return false;
}


//*****************************
// File Stuff
//*****************************

// Prompts the user to choose a file
function chooseFile() {
    get("file").click();
}

// Upload the chosen file to the server and displays the results
var numFiles = 0;
function newFiles() {
    let files = get("file").files;
    let filesData = [];

    for (let i = 0; i < files.length; i++) {
        const fileData = new FormData();
        fileData.append("file", files[i]);
        filesData.push(fileData);
    }

    var numFiles = files.length;
    files = [];
    var validFileUploaded = false;

    filesData.forEach(function (fileData) {
        fetch(mainUrl + "/upload",
            {
                method: "POST",
                body: fileData
            }
        ).then(response => response.json()).then(responseJson => {
            // No Error uploading file - unsupported file type or no text found
            if (responseJson.title !== "Unsupported Media Type" && responseJson.title !== "Bad Request") {
                // Save new song        
                let songData = responseJson;
                songData.newSong = true;
                saveAndSelectNewTab(songData);
                validFileUploaded = true;
            }

            // Last file to upload
            if (--numFiles === 0) {
                // Check if at least one file uploaded
                if (!validFileUploaded) {
                    clearSelectedTab();
                    goToView();
                    return;
                }

                // Unique to each page - go to view and diaplay song
                handleNewSong();
            }
        });
    });
}


//*****************************
// Extra
//*****************************

// Sets up an info prompt which closes when the page is clicked on
function setUpInfoPrompt(id) {
    document.addEventListener("click", function (event) {
        if (loadingPage || clickedOnClass(event, "promptLink")) {
            return;
        }

        get(id).classList.remove("prompted");
        document.removeEventListener("click", event);
    });

    get(id).classList.add("prompted");
}

// Go to the view page
function goToView() {
    window.location.href = "databaseView.html";
}

// Uploads text from clipboard as a new song
function newSongFromClipbaord() {
    navigator.clipboard.readText().then(songText => {
        fetch(mainUrl + "/parseTextDefault",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "text": songText
                })
            }
        ).then(response => response.json()).then(responseJson => {
            // Save new song
            let songData = responseJson;
            songData.newSong = true;
            saveAndSelectNewTab(songData);

            // Unique to each page - go to view and display song
            handleNewSong();
        });
    });
}

//*****************************
// Online/Offline
//*****************************

function goOffline() {

}

function goOnline() {

}
