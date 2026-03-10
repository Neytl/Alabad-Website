var prefix = window.location.origin.includes("local") ? "" : "https://thecabinet20230725181154.azurewebsites.net";
var updateCabinetURL = prefix + "/api/UpdateCabinet";
var loginURL = prefix + "/api/Login";

//*****************************
// Load Events
//*****************************

window.addEventListener("load", function () {
    // Delete Song
    get("deleteSongButton").addEventListener("click", function () {
        if (confirm("Delete this song?")) {
            deleteCurrentSong();
        }
    });

    // Add Song
    get("addSongButton").addEventListener("click", function () {
        addCurrentSong()
    });

    // Metadata inputs
    forEachClassElement("toggleEditDBInput", function (element) {
        let inputElements = {};

        inputElements.showDBValueDiv = element.childNodes[1];
        inputElements.showValue = inputElements.showDBValueDiv.childNodes[1];
        inputElements.editButtonImg = inputElements.showDBValueDiv.childNodes[3].childNodes[1];

        inputElements.dbInputDiv = element.childNodes[3];
        inputElements.dbInput = inputElements.dbInputDiv.childNodes[1];
        inputElements.approveButtonsDiv = inputElements.dbInputDiv.childNodes[3];
        inputElements.approveButton = inputElements.approveButtonsDiv.childNodes[1];

        // Show Edit
        inputElements.showDBValueDiv.addEventListener("click", function () {
            inputElements.dbInput.value = inputElements.showValue.innerHTML;
            inputElements.showDBValueDiv.classList.add("hidden");
            inputElements.dbInputDiv.classList.remove("hidden");
            inputElements.dbInput.focus();
            inputElements.dbInput.select();
        });

        // Approve Update
        inputElements.approveButton.addEventListener("mousedown", function () {
            tryUpdate(inputElements);
        });

        // Cancel Update
        inputElements.dbInput.addEventListener("blur", function () {
            hideUpdate(inputElements);
        });

        inputElements.dbInput.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "Escape":
                    // Clear input
                    if (!!this.value) {
                        this.value = "";
                    } else {
                        // Cancel Change
                        hideUpdate(inputElements);
                    }
                    break;
                case "Enter":
                    // Approve Update
                    tryUpdate(inputElements);
                    break;
            }
        });
    });

    // Language
    get("languageData").addEventListener("change", function () {
        get("englishOption").classList.toggle("hidden");
        get("spanishOption").classList.toggle("hidden");

        if (!songData.newSong) {
            requestUpdate("updateLanguage", this.value);
        }
    });

    // Check boxes - public domain, primary version, completion
    getAllClass("dbUpdateCheckbox").forEach(checkBox => {
        checkBox.addEventListener("change", function () {
            if (!songData.newSong) {
                requestUpdate("updateIs" + checkBox.id.split("is")[1], this.checked);
            }
        });
    });

    // Update Text
    get("updateTextButton").addEventListener("click", function () {
        requestUpdate("updateText", songData.text);
    });

    // Song Styles
    forEachClassElement("songStyleButton", function (element) {
        element.addEventListener("click", function () {
            let active = this.classList.toggle("chosen");

            if (songData.newSong) {
                return;
            }

            let style = this.innerHTML;

            if (active) {
                requestAddStyle(style);
            } else {
                requestRemoveStyle(style);
            }
        });
    });

    // Song Notes
    get("cabinetNotes").addEventListener("change", function () {
        if (!songData.newSong) {
            requestUpdate("updateNotes", get("cabinetNotes").value);
        } else {
            get("cabinetNotes").value = "";
        }
    });

    // Playlists
    get("addCabinetPlaylistButton").addEventListener("click", requsetAddPlaylistToCabinet);
    get("updateCabinetPlaylistButton").addEventListener("click", requsetUpdateCabinetPlaylist);

    // Prev/Next Song
    get("previousSongButton").addEventListener("click", function () {
        prevSong();
    });

    get("nextSongButton").addEventListener("click", function () {
        nextSong();
    });

    // New Blank Song
    /*    get("newBlankSongButton").addEventListener("click", function () {
            let blankSongData = {
                "songName": "New Song",
                "text": "add text...",
                "lyrics": "add text...",
                "newSong": true
            }
    
            openNewTab(blankSongData);
            showNewSong();
        });*/
});

// When loading in a new song, load data into the Cabinet Update tab
function setUpDBInputs() {
    // Title
    if (songData.newSong) {
        get("addSongButton").classList.remove("hidden");
        get("savedSongInfoContainer").classList.add("hidden");
        get("savedSongEditContainer").classList.add("hidden");
    } else {
        get("addSongButton").classList.add("hidden");
        get("songIdData").innerHTML = songData.id;
        get("savedSongInfoContainer").classList.remove("hidden");
        get("savedSongEditContainer").classList.remove("hidden");
    }

    // Metadata
    get("songNameData").innerHTML = songData.songName;

    if (!!songData.artist) {
        get("artistData").innerHTML = songData.artist;
        get("artistData").classList.remove("italics");
        get("artistDataButton").children[0].src = "./imgs/icons/pencil.png";
    } else {
        get("artistData").innerHTML = "Add Artist";
        get("artistData").classList.add("italics");
        get("artistDataButton").children[0].src = "./imgs/icons/add.png";
    }

    if (!!songData.songLink && songData.songLink != "No Results") {
        get("songLinkData").innerHTML = songData.songLink;
        get("songLinkData").classList.remove("italics");
        get("songLinkDataButton").children[0].src = "./imgs/icons/pencil.png";
    } else {
        get("songLinkData").innerHTML = "Add YouTube";
        get("songLinkData").classList.add("italics");
        get("songLinkDataButton").children[0].src = "./imgs/icons/add.png";
    }

    // Language
    if (!!songData.language && songData.language === "English") {
        get("languageData").value = "English";
        get("englishOption").classList.add("hidden");
        get("spanishOption").classList.remove("hidden");
    } else {
        get("languageData").value = "Spanish";
        get("englishOption").classList.remove("hidden");
        get("spanishOption").classList.add("hidden");
    }

    // Check boxes
    get("isPublicDomain").checked = !!songData.isPublicDomain;
    get("isPrimaryVersion").checked = (songData.newSong || !!songData.isPrimaryVersion);
    get("isMetadataCompleted").checked = !!songData.isMetadataCompleted;
    get("isChartCompleted").checked = !!songData.isChartCompleted;
    get("isPrintingCompleted").checked = !!songData.isPrintingCompleted;

    // Song Styles
    forEachClassElement("songStyleButton", function (element) {
        element.classList.remove("chosen");
    });

    if (!songData.newSong) {
        if (!!songData.styles) {
            showStyles(songData.styles);
        } else {
            fetch(dbUrl + "/song/" + songData.id + "/styles").then(response => response.json()).then(responseJson => {
                showStyles(responseJson);
                songData.styles = responseJson;
                saveTabs();
            });
        }

    }

    // Song Notes
    get("cabinetNotes").value = "";

    if (!songData.newSong) {
        if (!!songData.notes) {
            get("cabinetNotes").value = songData.notes;
        } else {
            fetch(dbUrl + "/song/" + songData.id + "/notes").then(response => response.json()).then(responseJson => {
                get("cabinetNotes").value = responseJson;
                songData.notes = responseJson;
                saveTabs();
            });
        }
    }

}

// Display the current song's saved style tags
function showStyles(styles) {
    forEachClassElement("songStyleButton", function (element) {
        if (styles.includes(element.innerHTML)) {
            element.classList.add("chosen");
        }
    });
}


//*****************************
// Log in
//*****************************
let token = null;

// Setup events related to loging in
function setupLoginEvents() {
    get("logoutButton").addEventListener("click", runLogout);
    get("closeLoginPopupButton").addEventListener("click", closeLoginPopup);
    get("loginUsername").addEventListener("focus", clearLoginMessage);
    get("loginPassword").addEventListener("focus", clearLoginMessage);

    get("loginUsername").addEventListener("keypress", event => {
        if (event.key == "Enter") {
            get("loginUsername").blur();
            get("loginButton").click();
        }
    });

    get("loginPassword").addEventListener("keypress", event => {
        if (event.key == "Enter") {
            get("loginPassword").blur();
            get("loginButton").click();
        }
    });

    get("loginButton").addEventListener("click", function () {
        if (!get("loginUsername").value) {
            setLoginMessage("Enter your username");
            return;
        }

        if (!get("loginPassword").value) {
            setLoginMessage("Enter your password");
            return;
        }

        runLogin();
    });
}

// Sets the login message text
function setLoginMessage(message) {
    get("loginMessage").innerHTML = message;
    get("loginMessage").classList.add("active");
}

// Clears the login message text
function clearLoginMessage() {
    get("loginMessage").classList.remove("active");
}

// Clears the login username/password fields
function clearLoginFields() {
    get("loginUsername").value = "";
    get("loginPassword").value = "";
}

// Attempt to login with the current username/password
function runLogin() {
    window.localStorage.setItem("connection", "loggingIn");

    fetch(loginURL,
        {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Username: get("loginUsername").value,
                Password: get("loginPassword").value
            })
        }
    ).then(response => {
        if (response.ok) {
            // Success! Valid Login
            onValidLogin(response);
        } else if (response.status === 401) {
            // Unauthorized - Bad username/password
            localStorage.setItem("connection", "loggedOut");
            setLoginMessage("Username or password is incorrect");
        } else if (response.status === 503) {
            // Service Unavailable
            get("loginPassword").value = "";
            localStorage.setItem("connection", "noConnection");
            setLoginMessage("Login failed: Could not connect to the database");
        }
    });
}

async function onValidLogin(response) {
    let responseJson = await response.json();
    token = responseJson.accessToken;
    localStorage.setItem("loggedInUser", get("loginUsername").value);
    localStorage.setItem("refreshToken", responseJson.refreshToken); // TODO: Remove once problem with mobile fixed
    onConnectionEstablished();
}

// Logout of the cabinet database
function runLogout() {
    unloadLoggedInFeatures();
    localStorage.setItem("connection", "loggedOut");
    localStorage.removeItem("showUnfinishedSongs");
    token = null;
    localStorage.removeItem("loggedInUser");

    // Ping the server to delete the refresh token
    fetch(loginURL + "/logout", {
        method: 'POST',
        credentials: 'include',
        // TODO: Remove once problem with mobile fixed:
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(localStorage.getItem("refreshToken"))
    });

    // Close the update tab if open
    let tabButtonClasses = get("dbOptionsButton").classList;

    if (tabButtonClasses.contains("chosen")) {
        get("sideMenuContentContainer").classList.add("closed");
        tabButtonClasses.remove("chosen");
    }

    tabButtonClasses.add("inactive");
}

// Called when a connection is established with the database
function onConnectionEstablished() {
    localStorage.setItem("connection", "loggedIn");
    if (!!callMethodOnceConnected) callMethodOnceConnected();
    closeLoginPopup();

    get("dbOptionsButton").classList.remove("inactive");

    if (!get("dbOptionsButton").classList.contains("chosen")) {
        get("dbOptionsButton").click();
    }
}
let callMethodOnceConnected = null;

// Open the login popup
function openLoginPopup() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    locktheScreen();
    get("loginPopup").classList.remove("hidden");
}

// Close the popup and reset its forms
function closeLoginPopup() {
    get("loginPopup").classList.add("hidden");
    unlockTheScreen();
    clearLoginFields();
    clearLoginMessage();
    callMethodOnceConnected = null;
}

function locktheScreen() {
    document.body.classList.add("locked");
}
function unlockTheScreen() {
    document.body.classList.remove("locked");
}

function refreshAccessToken(callAfterConnected) {
    get("loginUsername").value = localStorage.getItem("loggedInUser");
    callMethodOnceConnected = callAfterConnected;

    fetch(loginURL + "/refresh", {
        method: 'POST',
        credentials: 'include',
        // TODO: Remove once problem with mobile fixed:
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(localStorage.getItem("refreshToken"))
    }).then(response => {
        if (response.ok) {
            // Success! Access token refreshed
            onValidLogin(response);
        } else {
            // Unable to refresh token, log out
            runLogout();
            promptLogin();
        }
    });
}

function promptLogin() {
    clearLoginFields();
    setLoginMessage("Session expired...");
    openLoginPopup();
}

// Test a token to see if valid and test the connection to the database
function testDatabaseEditorConnection(comingFromLoginPopup) {
    // No need to test connection if logged out
    if (localStorage.getItem("connection") == "loggedOut") return;
    refreshAccessToken();
}


//*****************************
// Utitlity
//*****************************

// e.g. "Renuevame#54"
function getSongIdTag() {
    return songData.songName + "#" + songData.id;
}

//*****************************
// DB input style events
//*****************************

// Switch from edit metadata to view
function hideUpdate(inputElements) {
    inputElements.showDBValueDiv.classList.remove("hidden");
    inputElements.dbInputDiv.classList.add("hidden");
}

// Update metadata of a song
function tryUpdate(inputElements) {
    // Toggle edit/view
    hideUpdate(inputElements);

    let newValue = inputElements.dbInput.value;
    let showValueDiv = inputElements.showValue;

    // No Update
    if (isInvalidUpdateRequest(showValueDiv, newValue)) {
        return;
    }

    // Update styles for add/edit
    if (!!newValue) {
        showValueDiv.innerHTML = newValue;
        showValueDiv.classList.remove("italics");
        inputElements.editButtonImg.src = "./imgs/icons/pencil.png";
    } else {
        showValueDiv.innerHTML = "Add " + showValueDiv.title;
        showValueDiv.classList.add("italics");
        inputElements.editButtonImg.src = "./imgs/icons/add.png";
    }

    // Show song name on update
    if (songData.newSong && inputElements.showValue.id === "songNameData") {
        setTabName(newValue);
    }

    // Update
    if (!songData.newSong) {
        requestUpdate(inputElements.dbInput.id, newValue)
    }
}

// Checks if a metadata update request is invalid
function isInvalidUpdateRequest(showValueDiv, newValue) {
    // Name did not change
    if (showValueDiv.innerHTML === newValue) {
        return true;
    }

    // Song name must be 1 to 50 characters
    switch (showValueDiv.id) {
        case "songNameData":
            return (!newValue || newValue.length > 50); // Song name must be 1 to 50 characters
        case "artistData":
            return newValue.length > 50; // Artist must be 0 to 50 characters
        default:
            return false;
    }
}

//*****************************
// Requests
//*****************************

// Send request to delete current song - stays open as new song
function deleteCurrentSong() {
    let deleteEntity = {
        "id": songData.id
    };

    // Request Delete
    //console.log("Delete song \"" + getSongIdTag() + "\"");

    fetch(updateCabinetURL + "/deleteSong",
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(deleteEntity)
        }
    ).then(response => {
        if (!logSuccess(response, deleteCurrentSong)) return;

        // Save new data
        songData.id = null;
        songData.newSong = true;
        saveTabs();

        // Display
        setUpDBInputs();
    });
}

// Send request to add current song - reloads with new id
function addCurrentSong() {
    let newSongData = {};

    // Metadata
    newSongData.songName = songData.songName;

    if (!get("artistData").classList.contains("italics")) {
        newSongData.artist = get("artistData").innerHTML;
    }

    if (!get("songLinkData").classList.contains("italics")) {
        newSongData.songLink = get("songLinkData").innerHTML;
    }

    newSongData.language = get("languageData").value;
    newSongData.isPrimaryVersion = get("isPrimaryVersion").checked;
    newSongData.isPublicDomain = get("isPublicDomain").checked;

    // Text
    newSongData.text = songData.text;

    // Request Add
    fetch(updateCabinetURL + "/addSong",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(newSongData)
        }
    ).then(response => {
        if (!logSuccess(response, addCurrentSong)) return;

        response.json().then(responseJson => {
            // Save new song data
            songData.id = responseJson.id;
            songData.newSong = false;

            if (!!responseJson.artist) {
                songData.artist = responseJson.artist;
            }

            if (!!responseJson.songLink) {
                songData.songLink = responseJson.songLink;
            }

            songData.language = responseJson.language;
            songData.isPrimaryVersion = responseJson.isPrimaryVersion;
            newSongData.isPublicDomain = responseJson.isPublicDomain;
            newSongData.isMetadataCompleted = responseJson.isMetadataCompleted;
            newSongData.isChartCompleted = responseJson.isChartCompleted;
            newSongData.isPrintingCompleted = responseJson.isPrintingCompleted;
            songData.styles = responseJson.styles;
            saveTabs();

            // Display
            displaySongNonVariants(); // Artist, song Link, & Song Detail
            setUpDBInputs();
        });
    });
}

// Send request to update metadata
function requestUpdate(updateEndpoint, newVaule) {
    if (!newVaule && !updateEndpoint.startsWith("updateIs")) newVaule = null;

    let songEntity = {
        id = songData.id,
        artist = songData.artist, // Needed for metadata completeness check
        songLink = songData.songLink // Needed for metadata completeness check
    };

    let updateType = updateEndpoint.substring(6);
    songEntity[updateType] = newVaule;

    fetch(updateCabinetURL + "/" + updateEndpoint,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(songEntity)
        }
    ).then(response => {
        if (!logSuccess(response, () => requestUpdate(updateEndpoint, newVaule))) return;
        console.log(updateType, newVaule);

        switch (updateType) {
            case "SongName":
                songData.songName = newVaule;
                setTabName(newVaule);
                break;
            case "Artist":
                songData.artist = newVaule;
                saveTabs();
                displayArtist();
                break;
            case "SongLink":
                songData.songLink = newVaule;
                saveTabs();
                displaySongLink();
                break;
            case "Language":
                songData.language = newVaule;
                saveTabs();
                break;
            case "IsPublicDomain":
                songData.isPublicDomain = newVaule;
                saveTabs();
                break;
            case "IsMetadataCompleted":
                songData.isMetadataCompleted = newVaule;
                saveTabs();
                break;
            case "IsChartCompleted":
                songData.isChartCompleted = newVaule;
                saveTabs();
                break;
            case "IsPrintingCompleted":
                songData.isPrintingCompleted = newVaule;
                saveTabs();
                break;
            case "IsPrimaryVersion":
                songData.isPrimaryVersion = newVaule;
                saveTabs();
                break;
            case "Notes":
                songData.notes = newVaule;
                saveTabs();
                break;
        }
    });
}

// Send request to add song style to current song
function requestAddStyle(style) {
    //console.log("Request add style \"" + style + "\" to " + getSongIdTag());

    let styleEntity = {
        "id": songData.id,
        "styles": [style]
    }

    // Request add style
    fetch(updateCabinetURL + "/addStyle",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(styleEntity)
        }
    ).then(response => {
        if (!logSuccess(response, () => addCurrentSong(style))) return;
        if (!songData.styles) songData.styles = [];
        songData.styles.push(style);
        saveTabs();
    });
}

// Send request to remove song style from current song
function requestRemoveStyle(style) {
    //console.log("Request remove style \"" + style + "\" from " + getSongIdTag());

    let styleEntity = {
        "id": songData.id,
        "styles": [style]
    }

    // Request remove style
    fetch(updateCabinetURL + "/removeStyle",
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(styleEntity)
        }
    ).then(response => {
        if (!logSuccess(response, () => requestRemoveStyle(style))) return;
        if (!songData.styles) return; // Corrupted data - quit out early
        songData.styles.splice(songData.styles.indexOf(style), 1); // Remove the style
        saveTabs();
    });
}

// Log whether or not a request was successful
function logSuccess(response, retryMethod) {
    if (response.ok || !!response.id) {
        // Briefly show a success marker and return true
        let successMarker = make("img");
        successMarker.classList.add("successMarker")
        successMarker.src = "imgs/icons/check.png";
        get("dbOptionsButton").appendChild(successMarker);
        setTimeout(function () {
            get("dbOptionsButton").removeChild(successMarker);
        }, 1000);
        return true;
    } else {
        switch (response.status) {
            case 401: // Bad token
                refreshAccessToken(retryMethod);
                break;
            case 503: // No Connection
                runLogout();
                alert("Update failed: Could not connect to database");
                break;
            case 400: // Bad request - invalid update
                alert("Update failed: Invalid update");
                break;
            default: // Dunno
                alert("Update failed");
                break;
        }

        return false;
    }
}

// Load in the next song by ID
function nextSong() {
    fetch(dbUrl + "/nextSong/" + songData.id).then(response => response.json()).then(responseJson => {
        showAdjacentSong(responseJson, "Could not find a next song");
    });
}

// Load in the previous song by ID
function prevSong() {
    fetch(dbUrl + "/previousSong/" + songData.id).then(response => response.json()).then(responseJson => {
        showAdjacentSong(responseJson, "Could not find a previous song");
    });
}

// Show the next/previous song
function showAdjacentSong(responseJson, errorMessage) {
    if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
        alert(errorMessage);
        return;
    }

    // Save & Show data
    songData.notes = null;
    saveSongData(responseJson);
    saveSongMetadata(responseJson);
    showNewSong();

    // Update tab
    document.getElementsByClassName("currentPage")[0].childNodes[1].innerHTML = songData.songName;
}

//*****************************
// Playlists
//*****************************

// Adds the current Playlist to the Cabinet
function requsetAddPlaylistToCabinet() {
    console.log("Adding playlist to The Cabinet...");
    console.log("Name: " + playlistData.tabName);
    console.log("Song Ids: " + getPlaylistIds());
}

// Returns all song IDs in the current playlist
function getPlaylistIds() {
    return playlistData.songs.map(song => song.id);
}

// Updates a playlist with the current name on the Cabinet
function requsetUpdateCabinetPlaylist() {
    console.log("Updating a playlist in The Cabinet...")
    console.log("Name: '" + playlistData.tabName + "'");
    console.log("Song Ids: " + getPlaylistIds());
}
