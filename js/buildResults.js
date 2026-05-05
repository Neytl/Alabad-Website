
//*****************************
// Build Search Results
//*****************************

// Builds any result type
function buildResult(resultData) {
    switch (resultData.resultType) {
        case "song": return buildSongResult(resultData);
        case "artist": return buildArtistResult(resultData);
    }
}

// Builds a song result
function buildSongResult(songData) {
    let result = make("div");
    result.classList.add("result");
    let resultSections = "sections-Name-";

    // Click to open song
    result.addEventListener("click", function (event) {
        if (clickedOnClass(event, "songNameContainer") || (!clickedOnClass(event, "songLink") && !clickedOnClass(event, "smallIconButton"))) {
            viewSong(songData.id);
        }
    });

    // Song name
    let songNameSpan = make("span");
    songNameSpan.classList.add("resultTitle");
    songNameSpan.innerHTML = songData.songName;
    let songNameContainer = buildSongLink("note.png", "Note", songNameSpan, "Song: " + songData.songName);
    songNameContainer.classList.add("songNameContainer");
    result.appendChild(songNameContainer);

    addMiddleClickEvent(songNameSpan, function () {
        // Open song in the background
        loadNewSong(songData);
        //viewSongInNewTab(songData.id);
    });

    // YouTube
    if (!!songData.songLink) {
        ytLink = buildYTLink(songData);
        ytLink.classList.add("youTubeLink")
        result.appendChild(ytLink);
        resultSections += "YT-";
    }

    // Artist
    if (!!songData.artist) {
        let artistSpan = make("span");
        artistSpan.classList.add("artist");
        artistSpan.innerHTML = songData.artist;
        let artistButton = buildSongLink("artist.png", "Artist", artistSpan, "Artist: " + songData.artist);
        result.appendChild(artistButton);
        //gridTemplate += "10em ";
        resultSections += "Artist-";

        artistButton.addEventListener("click", function () {
            searchByArtist(songData.artist);
        });
    }

    // Result Info
    let resultInfoContainer = make("div");
    resultInfoContainer.classList.add("resultInfoContainer");
    let infoButton = buildSmallIconButton("Info", "info.png");
    infoButton.classList.add("unavailable");
    resultInfoContainer.appendChild(infoButton);
    infoButton.addEventListener("click", function (event) {
        showSongInfo(songData, event, true);
    });
    result.appendChild(resultInfoContainer);

    // Result template
    resultSections += "Info";
    result.classList.add(resultSections);
    return result;
}

// Builds an artist result
function buildArtistResult(artistData) {
    let result = make("div");
    result.classList.add("result");
    let gridTemplate = "1fr ";

    result.addEventListener("click", function () {
        searchByArtist(artistData.artist);
    });

    // Artist
    let artistSpan = make("span");
    artistSpan.innerHTML = artistData.artist;
    artistSpan.classList.add("resultTitle");
    let artistButton = buildSongLink("artist.png", "Artist", artistSpan, "Artist: " + artistData.artist);
    result.appendChild(artistButton);

    // Number of songs
    let numberOfSongsSpan = make("span");
    numberOfSongsSpan.innerHTML = "..." + (artistData.numberOfSongs > 1
        ? artistData.numberOfSongs + " Songs"
        : artistData.numberOfSongs + " Song");
    result.appendChild(build({
        type: "div",
        class: "resultInfoContainer",
        child: numberOfSongsSpan
    }));

    // Result template
    gridTemplate += "6em";
    result.style.gridTemplateColumns = gridTemplate;

    return result;
}

// Build an small icon button
function buildSmallIconButton(title, src) {
    let button = make("span");
    button.classList.add("smallIconButton");
    button.title = title;

    let icon = make("img");
    icon.src = "imgs/icons/" + src;
    icon.alt = title;

    button.appendChild(icon);
    return button;
}


//*****************************
// Search Result Events
//*****************************

// Load and open the song
function viewSong(id) {
    clearSelectedTab();
    localStorage.setItem("requestId", id);
    goToView();
}

// Load and open the song in a new chrome tab
function viewSongInNewTab(id) {
    localStorage.setItem("requestId", id);
    window.open("editSong", '_blank');
}

// Load the song but stay on songs page
function loadNewSong(songData) {
    songData.requestUpdate = true;
    loadNewTab(songData);
}

// Searches for songs by the specified artist
function searchByArtist(artist) {
    clearRefineSearch();
    get("searchInput").value = artist;
    search();
}

// Opens the share dialog with a the share url
function shareSong(songMetadata) {
    if (!songMetadata.id) {
        return;
    }

    navigator.share({
        title: "Song - " + songMetadata.songName,
        url: homeUrl + "/editSong?song=" + songMetadata.id
    });
}
