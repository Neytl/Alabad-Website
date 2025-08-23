var currentInfoPopup = null;

window.addEventListener("scroll", function () {
    // Remove the current info popup if open
    if (!!currentInfoPopup) {
        currentInfoPopup.remove();
        currentInfoPopup = null;
    }
});

// Show song info for a song at the clicked location
function showSongInfo(songData, event, faceInwards) {
    let infoPopup = make("div");
    infoPopup.classList.add("infoPopup");

    // Add data
    // - Song Name
    infoPopup.appendChild(makeInfoElement("Song", songData.songName, false, function () {
        searchText(songData.songName);
    }));

    if (!songData.newSong) { // Database Song:
        // Song styles
        let stylesContainer = make("div");

        //  - Styles styles part #1
        let typeSpan = make("span");
        addTextSpan("Tags", typeSpan);
        addTextSpan(":", typeSpan);
        stylesContainer.appendChild(typeSpan);

        // - Styles data
        let stylesSpan = addTextSpan("-", stylesContainer);

        // - Get the styles
        fetch(dbUrl + "/song/" + songData.id + "/styles").then(response => response.json()).then(responseJson => {
            if (responseJson.length === 0) {
                return;
            }

            // Show the styles
            stylesSpan.innerHTML = "";
            addTextSpan(responseJson[0], stylesSpan, function () {
                clearSearchData();
                sessionStorage.setItem("styles", JSON.stringify([responseJson[0]]));
                window.location.href = "databaseSongs.html";
            });

            for (let i = 1; i < responseJson.length; i++) {
                addTextSpan(", ", stylesSpan);
                addTextSpan(responseJson[i], stylesSpan, function () {
                    clearSearchData();
                    sessionStorage.setItem("styles", JSON.stringify([responseJson[i]]));
                    window.location.href = "databaseSongs.html";
                });

            }

            translateNodeToCurrentLanguage(stylesSpan);
        });

        // - Artist
        if (!!songData.artist) {
            infoPopup.appendChild(makeInfoElement("Artist", songData.artist, false, function () {
                searchText(songData.artist);
            }));
        }

        // - Song Styles
        infoPopup.appendChild(stylesContainer);

        // - Language / Find Translations
        infoPopup.appendChild(buildLanguageSongInfo(songData.language, function () {
            searchText("*" + songData.songName);
        }));

        // - ID
        infoPopup.appendChild(makeInfoElement("Song ID", "#" + songData.id, false));
    } else {
        // User Made Song
        // - Language / Find Translations
        infoPopup.appendChild(buildLanguageSongInfo("", function () {
            searchText("*" + songData.songName);
        }));
    }


    // Events
    infoPopup.addEventListener("mouseleave", function () {
        infoPopup.remove();
        currentInfoPopup = null;
    });

    currentInfoPopup = infoPopup;

    // Translate Popup
    translateNodeToCurrentLanguage(infoPopup);

    // Place info popup
    if (faceInwards) {
        infoPopup.style.right = (document.documentElement.clientWidth - event.clientX - 10) + "px";
    } else {
        infoPopup.style.left = (event.clientX - 10) + "px";
    }

    infoPopup.style.bottom = (document.documentElement.clientHeight - event.clientY - 10) + "px";
    document.body.appendChild(infoPopup);

    // - Top of popup hidden
    if (infoPopup.offsetHeight > (event.clientY + 10)) {
        infoPopup.style.top = (event.clientY - 10) + "px";
        infoPopup.style.bottom = "";
    }
}

function buildLanguageSongInfo(data, onclick) {
    // The Text
    let container = makeInfoElement("Language", data, true);
    container.classList.add("languageInfoContainer");

    // The translation button
    let button = buildSmallIconButton("Search for translations", "update.png");
    button.classList.add("foreground");
    button.addEventListener("click", onclick);
    container.appendChild(button);

    return container;
}

function makeInfoElement(type, data, translate, onclick) {
    let container = make("div");

    // Type Container
    let typeSpan = make("span");
    addTextSpan(type, typeSpan);
    addTextSpan(":", typeSpan);
    container.appendChild(typeSpan);

    // Data
    let dataSpan = addTextSpan(data, container, onclick);

    if (!translate) {
        dataSpan.classList.add("noTranslation");
    }

    return container;
}

function addTextSpan(text, container, onclick) {
    let textSpan = make("span");
    textSpan.innerHTML = text;
    container.appendChild(textSpan);

    // Search
    if (!!onclick) {
        textSpan.addEventListener("click", onclick);
        textSpan.classList.add("songInfoSearchLink");
        textSpan.title = "Search for '" + text + "' songs";
    }

    return textSpan;
}

//------------------
// Searches
//------------------

function searchText(text) {
    clearSearchData();
    sessionStorage.setItem("search", text);
    window.location.href = "databaseSongs.html";
}

//------------------
// YouTube Link
//------------------

function buildYTLink(songData) {
    let youTubeLink = make("a");

    if (songData.newSong) {
        youTubeLink.innerHTML = "YouTube Hit";
    } else {
        youTubeLink.innerHTML = "YouTube";
    }

    youTubeLink.href = songData.songLink;
    youTubeLink.target = "_blank";
    return buildSongLink("YouTube.png", "YouTube", youTubeLink, "View Song");
}
