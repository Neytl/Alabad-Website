//*****************************************************************************************************************
// Loading and data

//*****************************
// Page Load Events
//*****************************

// Before the page is loaded
document.addEventListener("DOMContentLoaded", function () {
    loadGeneralPageStuff();

    // Check if already logged in
    testDatabaseEditorConnection();

    if (localStorage.getItem("connection") == "loggedIn") {
        get("dbOptionsButton").classList.remove("inactive");
    }

    // Keys
    buildKeyButtons(false, false, false, "none");

    // Load Font Size
    let savedFontSize = localStorage.getItem("fontSize");
    if (!!savedFontSize) {
        setFontSize(parseInt(savedFontSize));
    }

    // Load Chord Colors
    let storedColor = localStorage.getItem("chordColor");
    if (!!storedColor) {
        setChordColor(storedColor);
    }

    // Adjust the editing options overflow
    adjustEditingOverflow();

    // Chec for a url from a link
    let searchParams = new URLSearchParams(window.location.search);

    // - Song link
    let songId = searchParams.get("song");
    if (!!songId) {
        window.history.replaceState(null, "", "databaseView.html");
        loadSongRequest(songId);
        return;
    }

    // - Playlist link
    let playlistName = searchParams.get("playlistName");
    if (!!playlistName) {
        window.history.replaceState(null, "", "databaseView.html");
        let playlistIds = searchParams.getAll("[]");

        if (!!playlistIds && playlistIds.length > 0) {
            loadNewPlaylist(playlistName, playlistIds);
        } else {
            loadDatabasePlaylist(playlistName);
        }

        return;
    }

    // Info Prompts
    let prompt = sessionStorage.getItem("prompt");

    if (!!prompt) { // Prompt Requested
        if (tabsData.length > 0 && tabsData[0].hasChords) {
            loadFirstTab();
            loadPrompt(prompt);
        } else {
            loadDefaultSong(prompt);
        }

        return;
    }

    // Load and show song
    if (!!playlistData) {
        loadPlaylist();
    } else if (!!songData) {
        showNewSong();
    } else if ("playlistData" in localStorage) {
        playlistData = JSON.parse(localStorage.getItem("playlistData"));

        // Get Songs metadata for playlist
        fetch(dbUrl + "/playlistSongsMetadata", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(playlistData.songIds)
        }).then(response => response.json()).then(responseJson => {
            if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
                promptNewSong();
                return;
            }

            playlistData.songs = responseJson;
            playlistData.songs.forEach(song => {
                song.newSong = false;
                song.requestUpdate = true;
            })

            openNewTab(playlistData); // saves the playlist and sets songData to the current playlist song
            loadPlaylist();
        });

        localStorage.removeItem("playlistData");
    } else if ("requestId" in localStorage) {
        loadSongRequest(localStorage.getItem("requestId"));
    } else {
        // Problem Loading Song
        promptNewSong();
    }
});

// Gets info from the server and loads a new tab with the song
function loadSongRequest(songId) {
    fetch(dbUrl + "/song/" + songId).then(response => response.json()).then(responseJson => {
        if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
            promptNewSong();
            return;
        }

        localStorage.removeItem("requestId");
        songData = responseJson;
        songData.newSong = false;
        openNewTab(songData);
        showNewSong();
    });
}

//*****************************
// User Load Events
//*****************************

window.addEventListener("load", function () {
    loadGeneralUserEvents();
    loadUserEvents();
    loadingPage = false;
});

// Set up all user interaction events
function loadUserEvents() {
    loadSongHeaderEvents();
    loadEdittingBarEvents();
    loadSideMenuEvents();

    // Prompt new song popup
    get("searchPrompt").addEventListener("click", function () {
        promptToSongs("noSearch");
    });

    get("uploadPrompt").addEventListener("click", chooseFile);

    get("pastePrompt").addEventListener("click", newSongFromClipbaord);

    get("darkOut").addEventListener("click", function () {
        if (get("loginPopup").classList.contains("hidden")) {
            // Close the prompt new song and go to Home
            window.location.href = "databaseHome.html";
        } else {
            // Close the login popup and stay on page
            closeLoginPopup();
        }
    });

    // Login
    setupLoginEvents();

    // Editing song text
    get("songTextEdit").addEventListener("change", function () {
        saveCurrentText();

        postNewText(this.value).then(responseJson => {
            showResponseChordChart(responseJson);
            lastEditedText = songData.text;
        });
    });

    get("songTextEdit").addEventListener("input", function () {
        resizeTextArea();
    });

    // View Song button
    get("viewSong").addEventListener("click", function () {
        // Check for empty song
        var songText = get("songTextEdit").value;
        if (!songText) {
            get("songTextEdit").focus();
            return;
        }

        // Switch to view
        setUpView();
    });

    // Edit Song Button
    get("editSong").addEventListener("click", function () {
        setUpEdit();
    });

    // Undo/Redo
    get("undoButton").addEventListener("click", undo);
    get("redoButton").addEventListener("click", redo);

    // Keyboard Shortcuts
    document.addEventListener("keydown", event => {
        if (event.ctrlKey) {
            switch (event.key) {
                case 'z': // Undo if not editing
                    if (!editing) undo();
                    break;
                case 'y': // Redo if not editing
                    if (!editing) redo();
                    break;
                case 's': // Save song text to DB
                    if (!!songData.newSong) break;
                    event.preventDefault();
                    get("updateTextButton").click();
                    break;
                case 'p': // Print the song
                    event.preventDefault();
                    get("printButton").click();
                    break;
                case 'F': // Format Sections
                    if (event.shiftKey) {
                        event.preventDefault();
                        requestFormat();
                    }
                    break;
                case '1': // Format Planning Center
                    event.preventDefault();
                    formatPlanningCenter();
                    break;
                case '2': // Add song to the database
                    event.preventDefault();
                    get("addSongButton").click();
                    break;
                case ' ': // Toggle editing
                    if (editing) {
                        saveCurrentText();

                        postNewText(get("songTextEdit").value).then(responseJson => {
                            showResponseChordChart(responseJson);
                            lastEditedText = songData.text;
                            get("viewSong").click();
                        });
                    } else {
                        get("editSong").click();
                    }
                    break;
            }
        } else {
            if (!editing && !!selectedChord) {
                chordSelectionKeyEvent(event);
            }
        }
    });

    // Dropping moved chords
    let songTextElement = get("songText");
    songTextElement.addEventListener('drop', event => {
        if (draggedChordNumber < 0) return;
        cancelDefault(event);

        // Try to get the line under the dropped position
        let droppedLineNumber = document.elementFromPoint(event.clientX, event.clientY + 20).parentNode.dataset.lineNumber;

        // Try again to get the line under the dropped position - further to the right
        if (!droppedLineNumber) {
            let lineChildElement = document.elementFromPoint(event.clientX - 50, event.clientY + 20);
            if (!lineChildElement || !lineChildElement.parentNode) return;
            droppedLineNumber = lineChildElement.parentNode.dataset.lineNumber;

            if (!droppedLineNumber) {
                let lineChildElement = document.elementFromPoint(event.clientX - 150, event.clientY + 20);
                if (!lineChildElement || !lineChildElement.parentNode) return;
                droppedLineNumber = lineChildElement.parentNode.dataset.lineNumber;
                if (!droppedLineNumber) return;
            }
        }

        // Request the move
        requestSpecialEdit({
            requestType: "Move Chord",
            elementNumber: draggedChordNumber,
            secondaryElementNumber: droppedLineNumber,
            portion: getXPositionPortion(event, songTextElement)
        });
    });

    songTextElement.addEventListener('dragenter', cancelDefault);
    songTextElement.addEventListener('dragover', cancelDefault);

    // Selected Chords
    document.addEventListener("click", (event) => {
        if (!!selectedChord && !clickedOnClass(event, "chord")) {
            deselectChord();
        }
    });
}

// Loads events related to the song header
function loadSongHeaderEvents() {
    // Song Name
    get("songNameEdit").addEventListener("blur", function () {
        // Revert if empty song name
        if (!this.value) {
            this.value = songData.songName;
        }
    });

    get("songNameEdit").addEventListener("keydown", function (event) {
        switch (event.key) {
            case "Escape":
                this.value = "";
                return;
            case "Enter":
                this.blur();
                return;
        }
    });

    get("songNameEdit").addEventListener("change", function () {
        // Revert if empty song name
        if (!this.value) {
            this.value = songData.tabName;
            return;
        }

        // Search for YT hits
        if (songData.newSong) {
            findAndShowYouTubeHit(this.value);
        }

        // Save new tab name
        setTabName(this.value);
    });


    // Song Info
    get("songInfo").addEventListener("click", function (event) {
        showSongInfo(songData, event, false);
    });

    // Share song
    get("shareSongButton").addEventListener("click", function () {
        shareSong(songData);
    });
}

// Loads events related to the editing bar
function loadEdittingBarEvents() {
    let songTextElement = get("songText");

    // Overflow for editing options
    window.addEventListener("click", event => {
        if (!clickedOn(event, "overflowContainer")) {
            get("overflowElements").classList.add("hidden");
        }
    });
    new ResizeObserver(adjustEditingOverflow).observe(get("sideMenuContentContainer"));
    window.addEventListener("resize", adjustEditingOverflow);
    get("overflowButton").addEventListener("click", function () {
        get("overflowElements").classList.toggle("hidden");
    });


    // Reset Changes
    get("resetButton").addEventListener("click", undoAll);

    // Download/Print
    get("downloadButton").addEventListener("click", downloadCurrentSong);
    get("printButton").addEventListener("click", printSong);

    // Font Size
    get("fontSize").addEventListener("keydown", function (event) {
        switch (event.key) {
            case "Enter":
                this.blur();
                break;
        }
    });
    get("fontSize").addEventListener("input", function () {
        setFontSize(parseInt(this.value));
    });
    get("fontSize").addEventListener("blur", function () {
        setFontSize(parseInt(lastFontSize));
    });
    get("growFontSize").addEventListener("click", function () {
        setFontSize(parseInt(get("fontSize").value) + 1);
    });
    get("shrinkFontSize").addEventListener("click", function () {
        setFontSize(parseInt(get("fontSize").value) - 1);
    });

    // Chord Colors
    window.addEventListener("click", event => {
        if (!clickedOn(event, "chordColorsContainer") && !clickedOn(event, "chordColorSelect")) {
            get("chordColorsContainer").classList.add("hidden");
        }
    });
    getAllClass("chordColor").forEach(function (element) {
        element.addEventListener("click", function () {
            setChordColor(element.id);
            get("chordColorsContainer").classList.add("hidden");
        });
    });
    get("chordColorSelect").addEventListener("click", function (event) {
        if (!clickedOn(event, "chordColorsContainer")) {
            get("chordColorsContainer").classList.toggle("hidden");
        }
    });

    // Chords/Lyrics
    get("displayType").addEventListener("change", function () {
        saveDisplayTypeChange(songData.displayType);

        if (this.value === "Complete") {
            songTextElement.innerHTML = songData.html;
            activateChordOptions();
        } else if (this.value === "Lyrics") {
            songTextElement.innerHTML = songData.lyrics;
            hideChordOptions();
        } else {
            songTextElement.innerHTML = songData.shortenedChart;
            activateChordOptions();
        }

        setupHTMLEditing();
        setDisplayType(this.value);
    });

    // Clean Song
    get("cleanSongButton").addEventListener("click", cleanSong);

    // Full Screen
    let fullscreened = false;
    get("fullscreenButton").addEventListener("click", function () {
        if (fullscreened) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        } else {
            let element = get("leftSplit");
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) { /* Safari */
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) { /* IE11 */
                element.msRequestFullscreen();
            }
        }
        fullscreened = !fullscreened;
    });
}

// Loads events related to the side menu tabs
function loadSideMenuEvents() {
    // Tabs opening/closing
    setUpSideMenuTabs();

    // Audio
    loadAudio();

    // Chord Mods
    get("toggleFlatsButton").addEventListener("click", toggleFlats);
    get("toggleSolfegeButton").addEventListener("click", toggleSolfege);

    // Playlist Events
    let playlistNameInput = get("playlistName");
    playlistNameInput.addEventListener("keydown", event => {
        switch (event.key) {
            case "Escape":
                playlistNameInput.value = playlistData.tabName;
                playlistNameInput.blur();
                return;
            case "Enter":
                setTabName(playlistNameInput.value);
                playlistNameInput.blur();
                return;
        }
    });
    get("addToPlaylistContainer").addEventListener("click", buildAddToPlaylistDropown);
}

//*****************************
// - User Load Events Helpers
//*****************************

// Move edit options between edit bar and overflow
var overflowStack = [];
function adjustEditingOverflow() {
    const MAX_HEIGHT = 40;
    const underflow = get("underflowElements");
    const overflow = get("overflowElements");
    const overflowButton = get("overflowContainer");

    while (overflowStack.length > 0 && underflow.offsetHeight <= MAX_HEIGHT) {
        const movingElement = overflowStack.pop();
        overflow.removeChild(movingElement);
        underflow.appendChild(movingElement);

        if (editing && overflowStack.length <= 2) {
            overflowButton.classList.add("hidden");
        }
    }

    if (overflowStack.length == 0) {
        overflowButton.classList.add("hidden");
    }

    if (underflow.offsetHeight > MAX_HEIGHT) {
        overflowButton.classList.remove("hidden");
    }

    while (underflow.offsetHeight > MAX_HEIGHT) {
        const overflowedChild = underflow.children[underflow.children.length - 1];
        overflowStack.push(overflowedChild);
        underflow.removeChild(overflowedChild);
        overflow.appendChild(overflowedChild);
    }
}

// Set the chord chart text font size
var lastFontSize;
function setFontSize(fontSize) {
    if (isNaN(fontSize)) {
        return;
    }
    if (fontSize < 4) {
        lastFontSize = 4;
        return;
    }
    if (fontSize > 20) {
        lastFontSize = 20;
        return;
    }

    get("fontSize").value = fontSize;
    localStorage.setItem("fontSize", fontSize);
    lastFontSize = fontSize;

    get("songText").style.fontSize = (fontSize * 1.5) + "px";
    get("songTextEdit").style.fontSize = (fontSize * 1.5) + "px";
}

// Sets and saves the chord color
function setChordColor(color) {
    localStorage.setItem("chordColor", color);

    if (color === 'chordColor1') {
        get("leftSplit").classList.remove("chordColor2");
    } else {
        get("leftSplit").classList.add("chordColor2");
    }
}


//*****************************
// Song Data
//*****************************
var songData;
var originalSongText;
var lastEditedText;
var editing = false;

// Saves data updating the current song
function saveSongData(newData) {
    // Save text
    songData.text = newData.text;
    songData.lyrics = newData.lyrics;
    songData.html = newData.html;
    songData.shortenedChart = newData.shortenedChart;
    songData.title = newData.title;

    // Modifiers
    songData.hasChords = newData.hasChords;
    songData.usingSolfege = newData.usingSolfege;
    songData.isMinorKey = newData.isMinorKey;
    songData.chordChartIsFlat = newData.chordChartIsFlat;

    // Key
    songData.key = newData.key;
    songData.keyChanges = newData.keyChanges;

    saveTabs();
}

// Saves metadata updating the current song
function saveSongMetadata(newData) {
    songData.songName = songData.tabName = newData.songName;
    songData.id = newData.id;
    songData.artist = newData.artist;
    songData.songLink = newData.songLink;
    songData.language = newData.language;
    songData.styles = newData.styles;
    songData.isPublicDomain = newData.isPublicDomain;
    songData.isPrimaryVersion = newData.isPrimaryVersion;
    songData.isMetadataCompleted = newData.isMetadataCompleted;
    songData.isChartCompleted = newData.isChartCompleted;
    songData.isPrintingCompleted = newData.isPrintingCompleted;
    songData.newSong = false;
    saveTabs();
}


//*****************************
// Playlists
//*****************************
var playlistData;
var usingPlaylist = false;

// Builds a new playlist with the specified ids
function loadNewPlaylist(playlistName, playlistIds) {
    usingPlaylist = true;

    // Get song data for playlist
    fetch(dbUrl + "/playlistSongsMetadata", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(playlistIds)
    }).then(response => response.json()).then(responseJson => {
        if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
            promptNewSong();
            return;
        }

        playlistData = {
            isPlaylist: true,
            newPlaylist: true,
            tabName: playlistName,
            currentSongId: playlistIds[0],
            songs: responseJson
        };

        playlistData.songs.forEach(song => {
            song.newSong = false;
            song.requestUpdate = true;
        });

        openNewTab(playlistData); // saves the playlist and sets songData to the current playlist song
        loadPlaylist();
    });
}

// Loads playlist with the specified name from the database
function loadDatabasePlaylist(playlistName) {
    usingPlaylist = true;

    // Get metadata for playlist
    fetch(dbUrl + "/playlist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(playlistName)
    }).then(response => response.json()).then(responseJson => {
        if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
            promptNewSong();
            return;
        }

        playlistData = {
            isPlaylist: true,
            tabName: playlistName,
            playlistLink: responseJson.playlistLink,
            songs: responseJson.songs.map(song => {
                song.newSong = false;
                song.requestUpdate = true;
                return song;
            })
        };

        if (!!responseJson.songs && responseJson.songs.length > 0) {
            playlistData.currentSongId = responseJson.songs[0].id;
        }

        openNewTab(playlistData); // saves the playlist and sets songData to the current playlist song
        loadPlaylist();
    });
}

// Loads and opens the playlist tab for the playlist currently stored in playlistData
function loadPlaylist() {
    usingPlaylist = true;

    // Update the playlist tab button
    get("playlistButton").classList.remove("hidden");
    get("addToPlaylistIcon").classList.add("hidden");
    get("playlistButton").classList.remove("inactive");

    // Display the selected song
    if (!!songData) {
        showNewSong();
    } else {
        noSavePlaylistSongs();
    }

    // Build the playlist tab content
    buildPlaylistItems()

    // Open the playlist tab
    let playlistButton = get("playlistButton");

    if (!playlistButton.classList.contains("chosen")) {
        setUpSideMenuTabs();
        playlistButton.click();
    }

    // Setup update playlist in db options tab
    if (!!playlistData.isDatabasePlaylist) {
        get("addCabinetPlaylistButton").classList.add("hidden");
        get("updateCabinetPlaylistButton").classList.remove("hidden");
    } else {
        get("addCabinetPlaylistButton").classList.remove("hidden");
        get("updateCabinetPlaylistButton").classList.add("hidden");
    }

    get("playlistUpdateContainer").classList.remove("hidden");
}

// Builds and sets the playlist tab content
function buildPlaylistItems() {
    showPlaylist(playlistData);
}

// Returns the songdata with the specified id from the current playlist
function getSongFromPlaylist(id) {
    let songs = playlistData.songs;
    for (let i = 0; i < songs.length; i++) {
        if (songs[i].id === id) {
            return songs[i];
        }
    }
}

// Closes the playlist and replaces it depending on the current song type
function deactivatePlaylist() {
    let playlistButton = get("playlistButton");

    // Close the previous playlist if open
    if (playlistButton.classList.contains("chosen")) {
        if (activeChords) {
            get("chordOptionsButton").click();
        } else {
            usingPlaylist = true;
            playlistButton.click();
            usingPlaylist = false;
        }
    }

    // Playlist tab button
    if (songData.newSong) { // Disable the button for new songs
        playlistButton.classList.add("hidden");
    } else { // Switch to "add playlist" for saved songs
        playlistButton.classList.remove("hidden");
        get("addToPlaylistIcon").classList.remove("hidden");
        get("playlistButton").classList.add("inactive");
    }

    // Hide update playlist in db options tab
    get("playlistUpdateContainer").classList.add("hidden");
}

// Event for "Add To Playlist" button onclick - creates the dropdown options
function requestAddToPlaylist(event) {
    let availablePlaylists = [];
    tabsData.forEach(tab => {
        if (!!tab.isPlaylist) {
            availablePlaylists.push(tab);
        }
    });

    if (availablePlaylists.length === 0) {
        createNewPlaylist();
    } else {
        // Build add to playlist dropdown
        let options = availablePlaylists.map(playlist => buildDropdownOption("add.png", "Add to '" + playlist.tabName + "'", function () {
            if (playlist.songs.some(song => song.id === songData.id)) {
                alert("Song is already in the playlist");
                return;
            }

            playlist.songs.push(songData);
            playlist.currentSongId = songData.id;
            removeTabData(songData);
            loadTab(playlist.tabId);
            loadPlaylist();
        }));

        options.push(buildDropdownOption("playlist.png", "Create New Playlist", function () {
            createNewPlaylist();
        }));

        buildDropdown(event, options);
    }
}

// Builds and adds a single option for the add to playlist dropdown
function buildAddToPlaylistOption(playlistName, icon, callback) {
    let option = make("div");
    let addIcon = make("img");
    addIcon.src = "imgs/icons/" + icon + ".png";
    option.appendChild(addIcon);
    let name = make("span");
    name.innerHTML = playlistName;
    option.appendChild(name);
    option.addEventListener("click", callback);
    get("addToPlaylistDropdown").appendChild(option);
}

// Create a new playlist with the current song, replacing the tab 
function createNewPlaylist() {
    usingPlaylist = true;
    playlistData = {};
    playlistData.songs = [songData];
    playlistData.isPlaylist = true;
    playlistData.tabName = "New Playlist";
    playlistData.currentSongId = songData.id;
    removeTabData(songData);
    openNewTab(playlistData); // saves the playlist and open a new tab
    loadPlaylist();
}

// Runs if a loaded playlist has no saved songs
function noSavePlaylistSongs() {
    deactivateSong();
    get("noSongsPromptContainer").onclick = function () {
        openInNewTab(buildPlaylistLinkUrl(playlistData));
    }
}

// Returns a list of open database songs
function getOpenSongs() {
    return tabsData.filter(tabData => (!tabData.isPlaylist && !tabData.newSong));
}

// No song to display
function deactivateSong() {
    hideChordOptions();
    get("songHeader").classList.add("hidden");
    get("editingRow").classList.add("hidden");
    get("songsCabinetUpdate").classList.add("hidden");
    get("songTextContainer").classList.add("hidden");
    get("songTextContainer").classList.add("hidden");
    get("noPlaylistSongs").classList.remove("hidden");
}

// Call when there is a song to display
function activateSong() {
    get("songHeader").classList.remove("hidden");
    get("editingRow").classList.remove("hidden");
    get("songsCabinetUpdate").classList.remove("hidden");
    get("songTextContainer").classList.remove("hidden");
    get("noPlaylistSongs").classList.add("hidden");
}


//*****************************************************************************************************************
// Display Song

//*****************************
// Display Song - General
//*****************************

// Sets ups the page for a new song and displays all song info (does not update tabs)
function showNewSong() {
    activateSong();

    if (!usingPlaylist) {
        deactivatePlaylist();
    }

    if (!!songData.requestUpdate) {
        fetch(dbUrl + "/song/" + songData.id).then(response => response.json()).then(responseJson => {
            if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
                // Couldn't load requested song
                removeTabData(songData);
                clearSelectedTab();
                loadTabs();
                promptNewSong();
                return;
            }

            delete songData.requestUpdate;
            songData.newSong = false;
            saveSongData(responseJson);
            showNewSong();
        });

        return;
    }

    if (!songData.firstSongText) {
        songData.firstSongText = songData.text;
        saveTabs();
    }

    switchToView();
    removeNoSongPrompt();
    showOriginalSongInfo();
}

// Displays all info for a new song
function showOriginalSongInfo() {
    // Fill in empty data
    if (!songData.songName) {
        if (!!songData.title && songData.title.match(/^[A-Za-z ]+$/g)) {
            songData.songName = songData.title;
        } else {
            songData.songName = "New Song";
        }
    }

    if (!songData.tabName) {
        songData.tabName = songData.songName;
        getFirst(".currentPage > .tabName").innerHTML = songData.tabName;
    }

    if (!songData.html) {
        songData.html = songData.text;
    }

    // Setup Display Type if not set
    if (!songData.displayType) {
        if (songData.hasChords) {
            setDisplayType("Complete");
        } else {
            setDisplayType("Lyrics");
        }
    }

    // Share button for database songs
    if (!!songData.id) {
        get("shareSongButton").classList.remove("hidden");
    } else {
        get("shareSongButton").classList.add("hidden");
    }

    // Save the starting song
    originalSongText = songData.text;

    // Display the song
    displaySongNonVariants();
    displaySongVariants();

    // Update DB inputs
    setUpDBInputs();
}

// Displays the results from a server response - updating the current song
function showResponseChordChart(response) {
    saveSongData(response);
    displaySongVariants();
}

// Saves, loads, and selects a new tab
function openNewTab(tabData) {
    saveNewTabData(tabData);
    selectTab(tabData.tabId);
    loadTabs();
}

// Set new tab name
function setTabName(newName) {
    // Update tab without reloading all tabs
    let currentTab = document.getElementsByClassName("currentPage")[0];
    currentTab.childNodes[1].innerHTML = newName;
    currentTab.title = newName;

    if (!usingPlaylist) { // A Song
        // Change title
        get("songNameEdit").value = newName;

        // Only for new songs
        if (songData.newSong) {
            // Change cabinet update title
            get("songNameData").innerHTML = newName;

            // Save as new song name as well
            songData.songName = newName;
        }

        // Save tab name
        songData.tabName = newName;
    } else { // A Playlist
        // Save tab name
        playlistData.tabName = newName;
    }

    saveTabs();
}


//*****************************
// Displaying Song Info
//*****************************

// Display song info that can have possibly changed with a song update
function displaySongVariants() {
    // Chords
    if (songData.hasChords) {
        getAll(".chordDisplayType").forEach(element => element.classList.remove("hidden"));

        // Key info
        buildKeyButtons(songData.chordChartIsFlat, songData.usingSolfege, songData.isMinorKey, songData.key);
        showKeyChanges(songData.keyChanges);

        // Set mod sliders
        setFlats(songData.chordChartIsFlat);
        setSolfege(songData.usingSolfege);
    } else if (songData.displayType != "Lyrics") { // All chords were removed
        // Hide un-needed options
        noActiveChords();
    }

    // Display text
    if (editing) {
        get("songTextEdit").value = songData.text;
        resizeTextArea();

        if (songData.hasChords) {
            activateChordOptions();
        }
    } else {
        if (songData.displayType === "Chords") {
            get("songText").innerHTML = songData.shortenedChart;
            get("displayType").value = "Chords";
        } else if (songData.displayType === "Lyrics") {
            get("songText").innerHTML = songData.lyrics;
            get("displayType").value = "Lyrics";
        } else {
            get("songText").innerHTML = songData.html;
            get("displayType").value = "Complete";
        }

        setupHTMLEditing();
    }
}

// Display song info that will not change with a song update
function displaySongNonVariants() {
    // Song Link
    displaySongLink();

    // Artist
    displayArtist();

    // Song name
    get("songNameEdit").value = songData.tabName;

    // Display type - Sticky active/inactive
    if (songData.displayType != "Lyrics") {
        // Show usable optios
        activateChordOptions();
    } else {
        // Hide un-needed options
        noActiveChords();
    }
}

// Show the current Artist
function displayArtist() {
    let artistElement = get("artist");

    if (!!songData.artist) {
        artistElement.innerHTML = "<span>By</span> " + songData.artist;
        translateNodeToCurrentLanguage(get("artist"));
        artistElement.classList.remove("hidden");
    } else {
        artistElement.innerHTML = "";
        artistElement.classList.add("hidden");
    }
}


//*****************************
// Display Song - Key
//*****************************
var keyOptions = [
    ["LA", "SIb", "SI", "DO", "REb", "RE", "MIb", "MI", "FA", "SOLb", "SOL", "LAb"],
    ["LA", "LA#", "SI", "DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#"],
    ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab"],
    ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
];

// Builds buttons for key changes
function buildKeyButtons(usingFlats, solfege, minorKey, selectedKey) {
    let keys = [];

    if (solfege) {
        if (usingFlats) {
            keys = keyOptions[0];
        } else {
            keys = keyOptions[1];
        }
    } else {
        if (usingFlats) {
            keys = keyOptions[2];
        } else {
            keys = keyOptions[3];
        }
    }

    let keyButtons = get("keyButtons");
    removeChildren(keyButtons);

    keys.forEach(function (key) {
        if (minorKey) key += "m";
        let keyButton = make("div");
        keyButton.innerHTML = key;

        if (key === selectedKey) {
            keyButton.classList.add("selectedKey");
        } else {
            keyButton.addEventListener("click", function () {
                transposeTo(key);
            });
        }

        keyButtons.appendChild(keyButton);
    });
}

// Displays key changes or hides indicators if no changes
function showKeyChanges(keyChanges) {
    if (!!keyChanges && keyChanges.length > 1) {
        let keyChangesString = keyChanges[0];
        for (let i = 1; i < keyChanges.length; i++) {
            keyChangesString += " \u2794 " + keyChanges[i];
        }
        get("keyChangeInfo").innerHTML = keyChangesString;

        get("keyChangeDiv").classList.remove("hidden");
        get("keyChangeAsterisk").classList.remove("hidden");
    } else {
        get("keyChangeDiv").classList.add("hidden");
        get("keyChangeAsterisk").classList.add("hidden");
    }
}


//*****************************************************************************************************************
// Modes/Stickies

//*****************************
// View/Edit Mode
//*****************************

// Switches to view mode and fills in changed song info
function setUpView() {
    originalSongText = songData.text;
    switchToView();
    displaySongVariants();
}

// Switches to view song if editing
function switchToView() {
    editing = false;
    get("editSong").classList.remove("hidden");
    get("viewSong").classList.add("hidden");
    get("songText").classList.remove("hidden");
    get("songTextEdit").classList.add("hidden");
    get("chordsEditing").classList.remove("hidden");
    get("chordsEditingHr").classList.remove("hidden");
    adjustEditingOverflow();
}

// Switches to editing mode and fills in changed song info
function setUpEdit() {
    originalSongText = lastEditedText = songData.text;
    switchToEdit();
    displaySongVariants();
    clearViewSpecificChanges();
}

// Switches to edit song if viewing
function switchToEdit() {
    editing = true;
    selectedChord = null;
    get("editSong").classList.add("hidden");
    get("viewSong").classList.remove("hidden");
    get("songText").classList.add("hidden");
    get("songTextEdit").classList.remove("hidden");
    get("chordsEditing").classList.add("hidden");
    get("chordsEditingHr").classList.add("hidden");
    adjustEditingOverflow();
}


//*****************************
// Side Tabs
//*****************************
var activeChords = true;
var isSideTabsSetup = false;

// Setup the on click events for the side menu tabs
function setUpSideMenuTabs() {
    if (isSideTabsSetup) {
        return;
    }

    isSideTabsSetup = true;

    let optionElements = getAllClass("sideMenuOption");

    optionElements.forEach(element => {
        element.addEventListener("click", function (event) {
            let tabName = element.dataset.tabName;

            // Chords option tab
            if (tabName === "chordOptions" && !activeChords) {
                return;
            }

            // Cabinet Database Editor tab 
            if (tabName === "dbOptions" && this.classList.contains("inactive")) {
                openLoginPopup();
                return;
            }

            // Playlist tab
            if (tabName === "playlist" && !usingPlaylist) {
                requestAddToPlaylist(event);
                return;
            }

            // General
            if (!this.classList.contains("chosen")) {
                optionElements.forEach(element => {
                    let tabName = element.dataset.tabName;

                    element.classList.remove("chosen");
                    get("sideMenuContentContainer").classList.remove(tabName);
                    get(tabName + "Container").classList.add("hidden");
                });

                this.classList.add("chosen");
                get("sideMenuContentContainer").classList.add(tabName);
                get("sideMenuContentContainer").classList.remove("closed");
                get(tabName + "Container").classList.remove("hidden");

                if (tabName === "dbOptions") {
                    get("databaseLogoutContainer").classList.remove("hidden");
                } else {
                    get("databaseLogoutContainer").classList.add("hidden");
                }
            } else {
                this.classList.remove("chosen");
                get("sideMenuContentContainer").classList.add("closed");
            }
        });
    });
}

// Closes the sticky collapsible
function hideChordOptions() {
    if (get("chordOptionsButton").classList.contains("chosen")) {
        get("chordOptionsButton").classList.remove("chosen");
        get("sideMenuContentContainer").classList.add("closed");
    }

    get("chordOptionsButton").classList.add("unavailable");
    get("chordOptionsButton").title = "No Chords";

    translateNodeToCurrentLanguage(get("chordOptionsButton"));
    activeChords = false;
}

// Sets the sticky to appear active
function activateChordOptions() {
    get("chordOptionsButton").classList.remove("unavailable");
    get("chordOptionsButton").title = "Transpose Options";
    translateNodeToCurrentLanguage(get("chordOptionsButton"));

    // Add Chords display options
    getAll(".chordDisplayType").forEach(element => element.classList.remove("hidden"));

    // If chords were added while editing, show them in the view
    if (editing) {
        setDisplayType("Complete");
    }

    activeChords = true;
}

// Removes the "Chords" options and hides the sticky
function noActiveChords() {
    hideChordOptions();

    // Remove Chords display options
    getAll(".chordDisplayType").forEach(element => element.classList.add("hidden"));
    setDisplayType("Lyrics");
}


//*****************************
// Display Type
//*****************************

// Set the display type and save data to tab
function setDisplayType(type) {
    get("displayType").value = type;
    songData.displayType = type;
    saveTabs();
}


//*****************************************************************************************************************
// Requests

//*****************************
// Requests - Transpose
//*****************************

var newKeyRequest;
// Transpose to a specified key
function transposeTo(newKey) {
    saveKeyChange(songData.key);
    newKeyRequest = newKey;
    postTextAndDisplay();
}

//*****************************
// Requests - Chord Mods
//*****************************
var chordChartIsFlat = false;
var usingSolfege = false;

// Switches between flats and sharps
function toggleFlats() {
    saveToggleFlats();
    chordChartIsFlat = !chordChartIsFlat;
    postTextAndDisplay();
}

// Set the flats toggle button
function setFlats(useFlats) {
    if (useFlats === undefined) {
        return;
    }

    chordChartIsFlat = useFlats;

    if (chordChartIsFlat) {
        get("toFlatsButton").classList.add("selected");
        get("toSharpsButton").classList.remove("selected");
    } else {
        get("toSharpsButton").classList.add("selected");
        get("toFlatsButton").classList.remove("selected");
    }
}

// Switches between solfege and letters
function toggleSolfege() {
    saveToggleSolfege();
    usingSolfege = !usingSolfege;
    postTextAndDisplay();
}

// Set the solfege toggle button
function setSolfege(useSolfege) {
    if (useSolfege === undefined) {
        return;
    }

    usingSolfege = useSolfege;

    if (usingSolfege) {
        get("toSolfegeButton").classList.add("selected");
        get("toLettersButton").classList.remove("selected");
    } else {
        get("toLettersButton").classList.add("selected");
        get("toSolfegeButton").classList.remove("selected");
    }
}

//*****************************
// Requests - Posting
//*****************************

// Posts new song text to the server and retruns the json response
async function postNewText(text) {
    return await fetch(mainUrl + "/parseTextDefault",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "text": text,
                language: (!!songData ? songData.language : null)
            })
        }
    ).then(response => response.json());
}

// Posts the song text (with modifiers) to be parsed and displayed
function postTextAndDisplay() {
    let requestPayload = {
        text: (editing ? lastEditedText : originalSongText),
        key: songData.key,
        chordChartIsFlat: chordChartIsFlat,
        usingSolfege: usingSolfege
    };

    if (!!newKeyRequest) {
        requestPayload.key = newKeyRequest;
        newKeyRequest = undefined;
    }

    if (!!songData.language) {
        requestPayload.language = songData.language;
    }

    fetch(mainUrl + "/parseText",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
        }
    ).then(response => response.json()).then(responseJson => {
        saveSongData(responseJson);
        showResponseChordChart(responseJson);
    });
}

//*****************************
// Requests - Song Link
//*****************************

// Searches for a song link based on the current song's name and saves/displays it
function findAndShowYouTubeHit(songName) {
    fetch(dbUrl + "/" + songName + "/songLink").then(response => response.json()).then(responseJson => {
        if (!!responseJson.songLink) {
            songData.songLink = responseJson.songLink;
            saveTabs();
            displaySongLink();
        } else {
            songData.songLink = "No Results";
            saveTabs();
        }
    });
}

// Builds and displays the current song link
function displaySongLink() {
    removeChildren(get("linkDiv"));

    if (!songData.songLink) {
        // Search for a YT hit - Note: Disabled for now
        //findAndShowYouTubeHit(songData.songName);
    } else if (songData.songLink !== "No Results") {
        // Display YT
        get("linkDiv").appendChild(buildYTLink(songData));
    }

    //    removeChildren(get("linkDiv"));
    //    get("linkDiv").appendChild(buildYTLink(songData));
}


//*****************************************************************************************************************
// Button Events

//*****************************
// - Undo Button
//*****************************

// Reverts song text to its original form when the user first entered this page
function undoAll() {
    if (!songData.firstSongText) return;

    if (confirm("Revert all changes?")) {
        saveCurrentText();

        postNewText(songData.firstSongText).then(responseJson => {
            saveSongData(responseJson);
            originalSongText = songData.text;

            if (songData.hasChords) {
                activateChordOptions();
                setDisplayType("Complete");
            }

            showResponseChordChart(songData);
        });
    }
}

//*****************************
// - Download Button
//*****************************

// Downloads a .docx file of the current song displayed
function downloadCurrentSong() {
    let downloadData = {
        language: songData.language,
        request: {
            chordColor: localStorage.getItem("chordColor")
        }
    };

    if (editing) {
        downloadData.text = get("songTextEdit").value;
        downloadData.request.showChords = true;
    }
    else {
        downloadData.text = songData.text;
        downloadData.request.showChords = (songData.displayType != "Lyrics");
    }

    downloadSong(downloadData);
}

// Download a .docx file with the specified song data
function downloadSong(downloadData) {
    fetch(mainUrl + "/download",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(downloadData)
        }
    ).then(resp => resp.blob()).then(blob => {
        downloadBlob(blob, songData.songName + ".docx");
    });
}

// Downloads a blob using the specified filename
function downloadBlob(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = make('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

//*****************************
// - Print Button
//*****************************

// Opens the song in the print page
function printSong() {
    // Print if settings are already saved, or if printing lyrics
    if (!!songData.newSong || !!songData.fontSize || songData.display == "Lyrics") {
        printSongWithoutUpdating();
        return;
    }

    // Load in print settings, then print
    fetch(dbUrl + "/printSettings/" + songData.id).then(response => response.json()).then(responseJson => {
        if (!responseJson.title || responseJson.title != "Not Found") {
            songData.fontSize = responseJson.fontSize;
            songData.numColumns = responseJson.numColumns;
            saveTabs();
        }

        // Print the song
        printSongWithoutUpdating();
    });
}

// Prints the current song data
function printSongWithoutUpdating() {
    // Print the song
    localStorage.setItem("specialPrintRequest", JSON.stringify(songData));

    if (usingSpanish()) {
        window.open("imprimiendo.html", "_blank");
    } else {
        window.open("printing.html", "_blank");
    }
}

//*****************************
// - Clean Song Button
//*****************************

// Cleans the text for the current song
function cleanSong(event) {
    buildDropdown(event, [
        buildDropdownOption("clean.png", "Format Sections", function () { requestFormat() }),
        buildDropdownOption("clean.png", "Format Planning Center", formatPlanningCenter),
        buildDropdownOption("clean.png", "Decapitalize", function () {
            postCleanedText(songData.text.replace(/([^\nA-ZÑÁÉÍÓÚ]([A-ZÑÁÉÍÓÚ]{2,}))|((?<=[A-ZÑÁÉÍÓÚ])[A-ZÑÁÉÍÓÚ])/g, function (group) { return group.toLowerCase(); }));
        }),
        buildDropdownOption("clean.png", "Scale Chords", scaleChords),
    ]);
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

function requestFormat(originalTextFontFamily) {
    saveCurrentText();

    let requestPayload = {
        text: (editing ? lastEditedText : originalSongText),
        key: songData.key,
        chordChartIsFlat: chordChartIsFlat,
        usingSolfege: usingSolfege
    };

    if (!!songData.language) {
        requestPayload.language = songData.language;
    } else {
        requestPayload.language = get("languageData").value;
    }

    if (!!originalTextFontFamily) {
        requestPayload.fontFamily = originalTextFontFamily;
    }

    fetch(mainUrl + "/formatSongText",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
        }
    ).then(response => response.json()).then(responseJson => {
        saveSongData(responseJson);
        originalSongText = songData.text;
        showResponseChordChart(songData);
    });
}

function formatPlanningCenter() {
    // Remove dots and fix INTRO formatting
    originalSongText = songData.text.replace(/\r\n.*\r\n$/, "\r\n").replace(/\./g, " ").replace(/:+/g, ":");
    let lines = originalSongText.split("\r\n");

    // Remove "Generating Preview" - when song is copy pasted in
    if (originalSongText.startsWith("\r\nGenerating Preview")) {
        lines.splice(0, 2);
    }

    // Remove key from the title
    lines[0] = lines[0].split('[')[0];
    lines[0] = lines[0].substring(0, lines[0].length - 1)

    // Capture song title
    setTabName(toTitleCase(lines[0]));

    // Capture artist
    get("artistData").innerHTML = lines[1].substring(1, lines[1].length - 1);
    get("artistData").classList.remove("italics");
    get("artistDataButton").src = "./imgs/icons/pencil.png";

    // Remove artist line
    lines.splice(1, 1);
    originalSongText = lines.join("\r\n");

    // Request the normal format
    requestFormat("Courier New");
}

function postCleanedText(newText) {
    saveCurrentText();

    postNewText(newText).then(responseJson => {
        saveSongData(responseJson);
        originalSongText = songData.text;
        showResponseChordChart(songData);
    });
}

// Special format option that scales all chords in the song by a multiplier
function scaleChords(event) {
    // Build Input
    let input = buildTextInput({
        value: 1,
        classes: ["dropdownOption", "chordEditInput"],
        noEvents: true
    });

    let dropdown = build({
        type: "div",
        class: "dropdown",
        child: input
    });

    // Destroying the dropdown
    let selfDestruct = function () {
        if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);

            // Edit made to the chord
            if (1 != input.value) {
                let amount = parseFloat(input.value)
                if (isNaN(amount)) return;

                requestSpecialEdit({
                    requestType: "Scale Chords",
                    scaleAmount: amount
                });
            }
        }
    };

    dropdown.addEventListener("mouseleave", selfDestruct);
    document.addEventListener("scroll", function handler(event) {
        // Listener removed after first triger
        event.currentTarget.removeEventListener(event.type, handler);
        selfDestruct();
    });

    // Input Events
    input.addEventListener("keydown", event => {
        switch (event.key) {
            case "Escape":
                input.value = "1";
                selfDestruct();
                return;
            case "Enter":
                selfDestruct();
                return;
        }
    });

    // Dropdown position
    dropdown.style.left = (event.clientX + window.pageXOffset - 10) + "px";
    dropdown.style.top = (event.clientY + window.pageYOffset - 10) + "px";
    document.body.appendChild(dropdown);

    // Select the text input once the dropdown is built 
    input.select();
}


//*****************************************************************************************************************
// Prompts

//*****************************
// Problem Loading Songs
//*****************************

// Locks the screen and prompts the user to find a song
function promptNewSong() {
    //locktheScreen();
    get("promptDiv").classList.remove("hidden");
}

// Removes the prompt if on the screen
function removeNoSongPrompt() {
    get("promptDiv").classList.add("hidden");
    //unlockTheScreen();
}


//********************
//* Home Prompts
//********************

// Diplays prompt and removes it from LS
function loadPrompt(prompt) {
    switch (prompt) {
        case "transpose":
            setUpInfoPrompt("chordOptionsButton");
            break;
        case "hear":
            setUpInfoPrompt("hearKeyButton");
            setUpSideMenuTabs();
            get("chordOptionsButton").click();
            break;
        case "download":
            setUpInfoPrompt("downloadPrintContainer");
            break;
    }

    sessionStorage.removeItem("prompt");
}

// Loads a default song for a prompt
function loadDefaultSong(prompt) {
    // Mighty to Save
    let defaultSongId = usingSpanish() ? 35 : 34;

    fetch(dbUrl + "/song/" + defaultSongId).then(response => response.json()).then(responseJson => {
        if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
            postNewText("Chord Progression\r\nC Am F G").then(responseJson => {
                songData = {
                    songName: "Chord Progression",
                    newSong: true,
                    displayType: "Complete"
                };
                saveSongData(responseJson);
                openNewTab(songData);

                // Display the song and prompt
                showNewSong();
                loadPrompt(prompt);
            });
            return;
        }

        // Save the data and select the tab
        songData = responseJson;
        songData.newSong = false;
        songData.displayType = "Complete";
        openNewTab(songData);

        // Display the song and prompt
        showNewSong();
        loadPrompt(prompt);
    });
}


//*****************************************************************************************************************
// Editing

//*****************************
// Editing - Dropdown
//*****************************

// Returns the offset of an element from the top of the page
function getOffsetTop(elem) {

    // Set our distance placeholder
    var distance = 0;

    // Loop up the DOM
    if (elem.offsetParent) {
        do {
            distance += elem.offsetTop;
            elem = elem.offsetParent;
        } while (elem);
    }

    // Return our distance
    return distance < 0 ? 0 : distance;
}

// Builds and displays a dropdown
function buildEditDropdown(event, optionElements, floatRight) {
    let container = get("leftSplit");

    let dropdown = build({
        type: "div",
        class: "dropdown",
        children: optionElements
    });

    // Destroying the dropdown
    let selfDestruct = function () {
        if (container.contains(dropdown)) {
            container.removeChild(dropdown);
        }
    };

    dropdown.addEventListener("mouseleave", selfDestruct);
    dropdown.addEventListener("click", selfDestruct);
    document.addEventListener("scroll", function handler(event) {
        // Listener removed after first triger
        event.currentTarget.removeEventListener(event.type, handler);
        selfDestruct();
    });

    // Dropdown position
    if (!!floatRight) {
        dropdown.style.left = (event.clientX + window.pageXOffset - 10) + "px";
    } else {
        dropdown.style.right = (document.documentElement.clientWidth - window.pageXOffset - event.clientX - 10) + "px";
    }

    dropdown.style.top = (event.clientY + window.pageYOffset - getOffsetTop(container) - 10) + "px";

    // Translate
    translateNodeToCurrentLanguage(dropdown);

    container.appendChild(dropdown);
}

//*****************************
// Editing - Events
//*****************************

var draggedChordNumber = -1;

function setupHTMLEditing() {
    let currentChordNumber = 0;
    getAll("#songText .chord").forEach(chordElement => {
        currentChordNumber++;
        let chordNumber = currentChordNumber;

        // Edit Chord
        addRightClickEvent(chordElement, function (event) {
            buildEditDropdown(event, [
                buildDropdownOption("pencil.png", "Edit", function () {
                    editChord(chordNumber, chordElement.innerHTML, event);
                }),
                buildDropdownOption("trash.png", "Remove", function () {
                    removeChord(chordNumber);
                })
            ], true);
        });

        // Move Chord
        let dragStart = function (chordNumber, chordElement) {
            draggedChordNumber = chordNumber;
            setTimeout(function () {
                chordElement.classList.add("dragging");
            }, 10);
        }

        let dragEnd = function (chordElement) {
            chordElement.classList.remove("dragging");
        }

        chordElement.setAttribute('draggable', true);
        chordElement.addEventListener('dragstart', event => {
            event.dataTransfer.effectAllowed = 'move';
            dragStart(chordNumber, chordElement)
        });
        chordElement.addEventListener('dragend', () => { dragEnd(chordElement) });

        // Select Chord
        chordElement.addEventListener("click", function () {
            selectChord(chordElement, chordNumber);
        });
    });

    // Line Edit Events
    let currentLineNumber = 0;
    getAll("#songText .lineGroup").forEach(lineGroupElement => {
        // Count up
        if (lineGroupElement.classList.contains("title")) return;
        currentLineNumber++;

        // Get the lyric line
        let lineElement = getLyricLine(lineGroupElement);
        if (!lineElement) return;

        let lineNumber = currentLineNumber;

        // Drop Chord
        let onDrop = function (event, droppedLineNumber) {
            if (draggedChordNumber < 0) return;
            cancelDefault(event);

            // Request the move
            requestSpecialEdit({
                requestType: "Move Chord",
                elementNumber: draggedChordNumber,
                secondaryElementNumber: droppedLineNumber,
                portion: getXPositionPortion(event, get("songText"))
            });
        };

        lineGroupElement.addEventListener('drop', event => {
            onDrop(event, lineNumber);
        });
        lineGroupElement.addEventListener('dragenter', cancelDefault);
        lineGroupElement.addEventListener('dragover', cancelDefault);

        if (false /*lineGroupElement.classList.contains("fullLine")*/) {
            // Right Click event for section title
            addRightClickEvent(lineElement, function (event) {
                // Build dropdown options
                let dropdownOptions = [];

                // Move the section up
                dropdownOptions.push(buildDropdownOption("up.png", "Move Up", function () {
                    combineLine(lineNumber);
                }));

                // Build dropdown
                buildEditDropdown(event, dropdownOptions, true);
            });
        } else {
            // Right Click event for lyrics line group
            addRightClickEvent(lineElement, function (event) {
                let splitPoint = getXPositionPortion(event, lineElement);

                // Build dropdown options
                let dropdownOptions = [];

                // Add Chord
                if (get("displayType").value != "Lyrics") {
                    dropdownOptions.push(buildDropdownOption("add.png", "Add a chord", function (clickEvent) {
                        addChord(lineNumber, splitPoint, clickEvent);
                    }));
                }

                // Split Line
                dropdownOptions.push(buildDropdownOption("splitLine.png", "Split line here", function () {
                    splitLine(lineNumber, splitPoint);
                }));

                // Combine Line
                let combineLinesOption = buildDropdownOption("combine.png", "Combine with previous", function () {
                    combineLine(lineNumber);
                });
                addRightClickEvent(combineLinesOption, newEvent => {
                    buildEditDropdown(event, [
                        buildDropdownOption("combine.png", "1 Space", function () { combineLine(lineNumber, 1); }),
                        buildDropdownOption("combine.png", "2 Spaces", function () { combineLine(lineNumber, 2); }),
                        buildDropdownOption("combine.png", "3 Spaces", function () { combineLine(lineNumber, 3); }),
                        buildDropdownOption("combine.png", "4 Spaces", function () { combineLine(lineNumber, 4); }),
                    ], true);
                });

                dropdownOptions.push(combineLinesOption);

                // Build dropdown
                buildEditDropdown(event, dropdownOptions, true);
            });
        }
    });

}

function getLyricLine(element) {
    for (let i = 0; i < element.children.length; i++) {
        let child = element.children[i];
        if (child.classList.contains("lyrics")) return child;
    }

    return null;
}

function addRightClickEvent(element, callback) {
    element.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        callback(event);
    }, false);
}

// Returns the portion from the left side of an element was clicked/dropped on (as a decimal)
function getXPositionPortion(event, element) {
    // Split lines
    if (element.offsetWidth > element.scrollWidth) {
        return (event.clientX - getXPosition(element) + get("songText").scrollLeft) / element.offsetWidth;
    }

    // Move Chords
    return (event.clientX - getXPosition(element)) / element.scrollWidth;
}

// Helper function to get an element's exact x position
function getXPosition(element) {
    var xPosition = 0;

    while (element) {
        if (element.tagName == "BODY") {
            // deal with browser quirks with body/window/document and page scroll
            var xScrollPos = element.scrollLeft || document.documentElement.scrollLeft;

            xPosition += (element.offsetLeft - xScrollPos + element.clientLeft);
        } else {
            xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
        }

        element = element.offsetParent;
    }

    return xPosition;
}


//*****************************
// Editing - Requests
//*****************************

function editChord(chordNumber, chordText, event) {
    // Build Chord Edit
    let chordInput = buildTextInput({
        value: chordText,
        classes: ["dropdownOption", "chordEditInput"],
        noEvents: true
    });

    let dropdown = build({
        type: "div",
        class: "dropdown",
        child: chordInput
    });

    // Destroying the dropdown
    let selfDestruct = function () {
        if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);

            // Edit made to the chord
            if (chordText != chordInput.value) {
                requestSpecialEdit({
                    requestType: "Edit Chord",
                    elementNumber: chordNumber,
                    newText: chordInput.value
                });
            }
        }
    };

    dropdown.addEventListener("mouseleave", selfDestruct);
    document.addEventListener("scroll", function handler(event) {
        // Listener removed after first triger
        event.currentTarget.removeEventListener(event.type, handler);
        selfDestruct();
    });

    // Chord Input Events
    chordInput.addEventListener("keydown", event => {
        switch (event.key) {
            case "Escape":
                chordInput.value = chordText;
                selfDestruct();
                return;
            case "Enter":
                selfDestruct();
                return;
        }
    });

    // Dropdown position
    dropdown.style.left = (event.clientX + window.pageXOffset - 10) + "px";
    dropdown.style.top = (event.clientY + window.pageYOffset - 10) + "px";
    document.body.appendChild(dropdown);

    // Select the text input once the dropdown is built 
    chordInput.select();
}

function addChord(lineNumber, splitPoint, event) {
    // Build Chord Edit
    let chordInput = buildTextInput({
        classes: ["dropdownOption", "chordEditInput"],
        noEvents: true
    });

    chordInput.placeholder = "Chord";

    let dropdown = build({
        type: "div",
        class: "dropdown",
        child: chordInput
    });

    // Destroying the dropdown
    let selfDestruct = function () {
        if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);

            // Edit made to the chord
            if (!!chordInput.value) {
                requestSpecialEdit({
                    requestType: "Add Chord",
                    elementNumber: lineNumber,
                    portion: splitPoint,
                    newText: chordInput.value
                });
            }
        }
    };

    dropdown.addEventListener("mouseleave", selfDestruct);
    document.addEventListener("scroll", function handler(event) {
        // Listener removed after first triger
        event.currentTarget.removeEventListener(event.type, handler);
        selfDestruct();
    });

    // Chord Input Events
    chordInput.addEventListener("keydown", event => {
        switch (event.key) {
            case "Escape":
                chordInput.value = "";
                selfDestruct();
                return;
            case "Enter":
                selfDestruct();
                return;
        }
    });

    // Dropdown position
    dropdown.style.left = (event.clientX + window.pageXOffset - 10) + "px";
    dropdown.style.top = (event.clientY + window.pageYOffset - 10) + "px";
    document.body.appendChild(dropdown);

    // Select the text input once the dropdown is built 
    chordInput.select();
}

function removeChord(chordNumber) {
    requestSpecialEdit({
        requestType: "Remove Chord",
        elementNumber: chordNumber,
    });
}

function splitLine(lineNumber, splitPoint) {
    requestSpecialEdit({
        requestType: "Split Line",
        elementNumber: lineNumber,
        portion: splitPoint
    });
}

function combineLine(lineNumber, newNumberSpaces) {
    let numSpaces;

    if (!!newNumberSpaces) {
        localStorage.setItem("numCombineSpaces", newNumberSpaces);
        numSpaces = newNumberSpaces;
    } else {
        let storedSpaces = localStorage.getItem("numCombineSpaces");
        if (!!storedSpaces) {
            numSpaces = parseInt(storedSpaces);
        } else {
            numSpaces = 1;
        }
    }

    requestSpecialEdit({
        requestType: "Combine Line",
        elementNumber: lineNumber,
        numberSpaces: numSpaces
    });
}

function requestSpecialEdit(requestData) {
    let requestPayload = {
        text: originalSongText,
        key: songData.key,
        chordChartIsFlat: chordChartIsFlat,
        usingSolfege: usingSolfege,
        request: requestData
    };

    if (!!songData.language) {
        requestPayload.language = songData.language;
    }

    deselectChord();

    fetch(mainUrl + "/specialEdit",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
        }
    ).then(response => response.json()).then(responseJson => {
        saveCurrentText();
        originalSongText = responseJson.text;
        showResponseChordChart(responseJson);

        switch (requestData.requestType) {
            case "Move Chord":
            case "Shift Chord":
            case "Edit Chord":
                selectChordByNumber(requestData.elementNumber);
                break;
            case "Remove Chord":
                // Select the next chord
                if (!selectChordByNumber(selectedChordNumber) && selectedChordNumber != 1)
                    selectChordByNumber(selectedChordNumber - 1); // If on the last chord, select the previous
                break;
        }
    });
}

//*****************************
// Editing - Undo/Redo
//*****************************

var undoStack = [];
var redoStack = [];
var loadingChange = false;

function undo() {
    if (undoStack.length === 0) return;
    let change = undoStack.pop();
    redoStack.push(invertChange(change));
    get("redoButton").classList.remove("disabled");
    if (undoStack.length === 0) get("undoButton").classList.add("disabled");
    loadChange(change);
}

function redo() {
    if (redoStack.length === 0) return;
    let change = redoStack.pop();
    undoStack.push(invertChange(change));
    get("undoButton").classList.remove("disabled");
    if (redoStack.length === 0) get("redoButton").classList.add("disabled");
    loadChange(change);
}


function saveCurrentText() {
    saveChange({
        type: "Hard Load",
        text: songData.text
    });
}

function saveToggleSolfege() {
    saveChange({
        type: "Toggle Solfege"
    });
}

function saveToggleFlats() {
    saveChange({
        type: "Toggle Flats"
    });
}

function saveKeyChange(oldKey) {
    saveChange({
        type: "Set Key",
        key: oldKey
    });
}

function saveChange(data) {
    if (loadingChange) return;
    redoStack = [];
    get("redoButton").classList.add("disabled");
    get("undoButton").classList.remove("disabled");
    undoStack.push(data);
}

function saveDisplayTypeChange(oldDisplayType) {
    saveChange({
        type: "Set Display Type",
        displayType: oldDisplayType
    });
}

function clearViewSpecificChanges() {
    undoStack = undoStack.filter(e => e.type !== "Set Display Type");
    if (undoStack.length === 0) get("undoButton").classList.add("disabled");
    redoStack = redoStack.filter(e => e.type !== "Set Display Type");
    if (redoStack.length === 0) get("redoButton").classList.add("disabled");
}


function loadChange(data) {
    loadingChange = true;

    switch (data.type) {
        case "Set Key":
            transposeTo(data.key); break;
        case "Hard Load":
            postNewText(data.text).then(responseJson => {
                showResponseChordChart(responseJson);
                originalSongText = responseJson.text;
            });
            break;
        case "Toggle Flats":
            toggleFlats(); break;
        case "Toggle Solfege":
            toggleSolfege(); break;
        case "Set Display Type":
            setDisplayType(data.displayType);

            if (data.displayType === "Lyrics") {
                get("songText").innerHTML = songData.lyrics;
                hideChordOptions();
            } else if (data.displayType === "Chords") {
                get("songText").innerHTML = songData.shortenedChart;
                activateChordOptions();
            } else {
                get("songText").innerHTML = songData.html;
                activateChordOptions();
            }

            setupHTMLEditing();
            break;
    }

    loadingChange = false;
}

function invertChange(data) {
    switch (data.type) {
        case "Set Key":
            return {
                type: "Set Key",
                key: songData.key
            };
        case "Hard Load":
            return {
                type: "Hard Load",
                text: songData.text
            };
        case "Toggle Flats":
            return {
                type: "Toggle Flats",
            };
        case "Toggle Solfege":
            return {
                type: "Toggle Solfege",
            };
        case "Set Display Type":
            return {
                type: "Set Display Type",
                displayType: songData.displayType
            };
    }
}

//*****************************
// Editing - Selecting a chord
//*****************************
var selectedChord = null;
var selectedChordNumber;

function chordSelectionKeyEvent(event) {
    switch (event.key) {
        case 'Escape':
            event.preventDefault();
            deselectChord();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            shiftChord(selectedChordNumber, false);
            break;
        case 'ArrowRight':
            event.preventDefault();
            shiftChord(selectedChordNumber, true);
            break;
        case 'Backspace':
        case 'Delete':
            event.preventDefault();
            removeChord(selectedChordNumber);
            selectedChord = null;
            break;
        case ' ':
            event.preventDefault();
            editChord(selectedChordNumber, selectedChord.innerHTML, getOffset(selectedChord));
            deselectChord();
            break;
        case 'ArrowUp':
            selectChordByNumber(selectedChordNumber - 1);
            event.preventDefault();
            break;
        case 'ArrowDown':
            selectChordByNumber(selectedChordNumber + 1);
            event.preventDefault();
            break;
    }

}

function deselectChord() {
    if (!!selectedChord) {
        selectedChord.classList.remove("selected");
        selectedChord = null;
    }
}

function selectChord(chordElement, chordNumber) {
    deselectChord();
    chordElement.classList.add("selected");
    selectedChord = chordElement;
    selectedChordNumber = chordNumber;
}


// Tries to select a chord by number, will do nothing if an invalid chord number
// returns true if successful
function selectChordByNumber(chordNumber) {
    let newChord = getChordElement(chordNumber);
    if (!!newChord) {
        selectChord(newChord, chordNumber);
        return true;
    }
    return false;
}

function getChordElement(chordNumber) {
    if (chordNumber < 1) return null;
    let chords = getAll(".chord");
    if (chordNumber > chords.length) return null;
    return chords[chordNumber - 1];
}

function getOffset(element) {
    const rect = element.getBoundingClientRect();
    return {
        clientX: rect.left,
        clientY: rect.top
    };
}


function shiftChord(chordNumber, moveRight) {
    requestSpecialEdit({
        requestType: "Shift Chord",
        elementNumber: chordNumber,
        shiftForward: moveRight
    });
}


//*****************************************************************************************************************
// Other

//*****************************
// Other - Events
//*****************************

// Resize the textarea to fit a song
function resizeTextArea() {
    var rows = (get("songTextEdit").value.match(/\n/g) || []/*(For empty text area)*/).length + 1;

    if (rows > 19) {
        get("songTextEdit").rows = rows + 1;
    } else {
        get("songTextEdit").rows = 20;
    }
}


//*****************************
// Other - Handlers
//*****************************

// Reload the tabs and display the song
function handleNewSong() {
    loadTabs();

    if (usingPlaylist) {
        loadPlaylist();
    } else {
        deactivatePlaylist();
        showNewSong();
    }
}

// What to do after a search is stored and requested
function handleSearchRequest() {
    clearRefineSearchData();
    window.location.href = "databaseSongs.html";
}


//*****************************
// Other - Random Stuff
//*****************************

// Replaces all words in the edit textarea containing multiple capitalized letters in a row with lower case
function decapitalizeText() {
    get("songTextEdit").value = get("songTextEdit").value.replace(/([A-ZÑÁÉÍÓÚ]{2,})/g, function (group) { return group.toLowerCase(); });
}