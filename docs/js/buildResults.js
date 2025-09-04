
//*****************************
// Build Search Results
//*****************************

// Builds any result type
function buildResult(resultData) {
    switch (resultData.resultType) {
        case "song": return buildSongResult(resultData);
        case "artist": return buildArtistResult(resultData);
        case "playlist": return buildPlaylistSearchResult(resultData);
    }
}

// Builds a song result
function buildSongResult(songData) {
    let result = make("div");
    result.classList.add("result");
    let gridTemplate = "1fr ";

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
        result.appendChild(buildYTLink(songData));

        if (!songData.artist) {
            gridTemplate += "17em ";
        } else {
            gridTemplate += "6em ";
        }
    }

    // Artist
    if (!!songData.artist) {
        let artistSpan = make("span");
        artistSpan.classList.add("artist");
        artistSpan.innerHTML = songData.artist;
        let artistButton = buildSongLink("artist.png", "Artist", artistSpan, "Artist: " + songData.artist);
        result.appendChild(artistButton);
        gridTemplate += "10em ";

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
    gridTemplate += "2em";
    result.style.gridTemplateColumns = gridTemplate;

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

// Builds an playlist result
function buildPlaylistSearchResult(playlistMetadata) {
    let result = make("div");
    result.classList.add("result");
    let gridTemplate = "1fr ";

    result.addEventListener("click", function (event) {
        if (!clickedOnClass(event, "smallIconButton")) {
            viewPlaylist(playlistMetadata);
        }
    });

    // Playlist Name
    let nameSpan = build({
        type: "span",
        innerHTML: playlistMetadata.playlistName,
        class: "resultTitle"
    });

    let playlistHeader = buildSongLink("playlist.png", "Playlist", nameSpan, "Playlist: " + playlistMetadata.playlistName);
    result.appendChild(playlistHeader);


    // Playlist info
    let resultInfoContainer = make("div");
    resultInfoContainer.classList.add("resultInfoContainer");
    let infoButton = buildSmallIconButton("Info", "info.png");
    infoButton.classList.add("unavailable");
    resultInfoContainer.appendChild(infoButton);
    result.appendChild(resultInfoContainer);

    infoButton.addEventListener("click", function () {
        showPlaylistInfo(playlistMetadata);
    });

    // Result template
    gridTemplate += "2em";
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

// Load and open the playlist
function viewPlaylist(playlistMetadata) {
    clearSelectedTab();

    let playlistData = {
        isPlaylist: true,
        tabName: playlistMetadata.playlistName,
        playlistLink: playlistMetadata.playlistLink,
        songIds: playlistMetadata.songIds
    };

    if (!!playlistMetadata.currentSongId) {
        playlistData.currentSongId = playlistMetadata.currentSongId;
    } else if (playlistMetadata.songIds.length > 0) {
        playlistData.currentSongId = playlistMetadata.songIds[0];
    }

    localStorage.setItem("playlistData", JSON.stringify(playlistData));
    goToView();
}

// Load and open the song in a new chrome tab
function viewSongInNewTab(id) {
    localStorage.setItem("requestId", id);
    window.open("databaseView.html", '_blank');
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
        url: homeUrl + "/databaseView.html?song=" + songMetadata.id
    });
}


//*****************************
// Playlist Result
//*****************************

// Sets up the playlist element
function showPlaylist(playlistMetadata) {
    // Playlist name
    get("playlistName").value = playlistData.tabName;

    // YouTube link
    if (!!playlistMetadata.playlistLink) { // Saved playlist link
        get("playlistLink").href = buildPlaylistLinkUrl(playlistMetadata);
    } else { // None saved - Generate a new playlist link
        fetch(dbUrl + "/playlistLink", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(playlistMetadata.songs.map(song => song.id))
        }).then(response => response.json()).then(responseJson => {
            if (!responseJson || noDBConnection(responseJson)) {
                return;
            }

            playlistData.playlistLink = responseJson;
            get("playlistLink").href = responseJson;
            saveTabs();
        });
    }

    // Share Playlist
    get("sharePlaylist").onclick = function () {
        let shareUrl = homeUrl + "/databaseView.html?playlistName=" + playlistMetadata.tabName;

        if (!!playlistMetadata.newPlaylist) {
            songsIds.forEach(id => shareUrl += "&[]=" + id);
        }

        navigator.share({
            title: "Playlist - " + playlistData.tabName,
            url: shareUrl
        });
    };

    // Songs
    let songs = get("playlistSongs");
    removeChildren(songs);

    resultNumber = 0;
    let songsIds = [];
    playlistMetadata.songs.forEach(songMetadata => {
        songsIds.push(songMetadata.id);
        songs.appendChild(buildPlaylistResult(songMetadata, playlistMetadata));
    });

    // Translate
    translateNodeToCurrentLanguage(get("playlist"));

    // Sortable
    setupSortableGroup(songs);

    // Add Songs Button
    if (getOpenSongs().length > 0) {
        get("addToPlaylistContainer").classList.remove("hidden");
    } else {
        get("addToPlaylistContainer").classList.add("hidden");
    }
}

// Returns the url for a playlist
function buildPlaylistLinkUrl(playlistMetadata) {
    // New Playlist - can't select the song to start from - use the full saved link
    if (!!playlistMetadata.newPlaylist) {
        return playlistMetadata.playlistLink;
    }

    // Generate a link for a saved playlist
    let playlistLinkUrl = "https://www.youtube.com/watch?";

    // Default to the first song if none selected
    if (!playlistMetadata.currentSongId && playlistMetadata.songs.length > 0) {
        playlistMetadata.currentSongId = playlistMetadata.songs[0].id;
    }

    // Start playlist from the current selected song
    if (!!playlistMetadata.currentSongId) {
        let currentSong = playlistMetadata.songs.find(song => { return song.id === playlistMetadata.currentSongId });
        playlistLinkUrl += "v=" + currentSong.songLink.split("v=")[1] + "&";
    } else {
        playlistLinkUrl = "https://www.youtube.com/playlist?";
    }

    playlistLinkUrl += playlistMetadata.playlistLink;
    return playlistLinkUrl;
}

// Builds the url for a song in a playlist
function buildPlaylistSongLinkUrl(playlistMetadata, songMetadata) {
    if (!!playlistMetadata.newPlaylist) {
        return songMetadata.songLink;
    }

    return "https://www.youtube.com/watch?v=" + songMetadata.songLink.split("v=")[1] + "&" + playlistMetadata.playlistLink;
}

// Builds a dropdown prompting to add open songs to the current playlist
function buildAddToPlaylistDropown(event) {
    let openSongs = getOpenSongs();

    let options = openSongs.map(newSong => buildDropdownOption("add.png", "Add '" + newSong.songName + "'", function () {
        if (playlistData.songs.some(song => song.id === newSong.id)) {
            alert("Song is already in the playlist");
            return;
        }

        if (playlistData.songs.length === 0) {
            playlistData.currentSongId = newSong.id;
        }

        playlistData.songs.push(newSong);
        closeTab(newSong);
        loadPlaylist();
    }));

    if (openSongs.length > 1) {
        options.push(buildDropdownOption("add.png", "Add All", function () {
            openSongs.forEach(openSong => {
                if (playlistData.songs.some(song => song.id === openSong.id)) {
                    return; // Protect against duplicate songs
                }

                playlistData.songs.push(openSong);
                closeTab(openSong);
            });

            loadPlaylist();
        }));
    }

    buildDropdown(event, options);
}

var resultNumber = 0;
// Builds and returns a single playlist result
function buildPlaylistResult(songMetadata, playlistMetadata) {
    resultNumber++;
    let result = make("div");
    result.classList.add("result");

    let currentSong = (songMetadata.id === playlistMetadata.currentSongId)

    if (currentSong) {
        result.classList.add("currentSong");
    }

    // Number/Playing
    result.appendChild(build({
        type: "span",
        class: "songLabel",
        children: [
            build({
                type: "span",
                innerHTML: (resultNumber + "."),
                class: "songNumber"
            }),
            buildImage({
                src: "play.png",
                class: "playingSongIcon"
            }),
            buildImage({
                src: "move.png",
                class: "moveIcon"
            })
        ]
    }));

    // On click
    result.addEventListener("click", function () {
        if (this.classList.contains("currentSong")) {
            return;
        }

        if (!clickedOnClass(event, "smallIconButton")) {
            getFirst(".currentSong").classList.remove("currentSong");
            this.classList.add("currentSong");
            playlistMetadata.currentSongId = songMetadata.id;
            songData = songMetadata;
            saveTabs();
            showNewSong();

        }
    });

    // Song name
    let songNameSpan = make("span");
    songNameSpan.classList.add("resultTitle");
    songNameSpan.innerHTML = songMetadata.songName;

    let songNameContainer = buildSongLink("note.png", "Note", songNameSpan, "Song: " + songMetadata.songName);

    songNameContainer.classList.add("songNameContainer");
    result.appendChild(songNameContainer);

    addMiddleClickEvent(songNameSpan, function () {
        viewSongInNewTab(songMetadata.id);
    });

    // Result Info
    let resultInfoContainer = make("div");
    resultInfoContainer.classList.add("resultInfoContainer");

    // YouTube
    if (!!songMetadata.songLink) {
        let ytLink = buildSmallIconButton("YouTube", "YouTube.png");
        ytLink.classList.add("ytIcon");
        ytLink.classList.add("foreground");

        ytLink.addEventListener("click", function () {
            openInNewTab(buildPlaylistSongLinkUrl(playlistMetadata, songMetadata));
        });

        resultInfoContainer.appendChild(ytLink);
    }

    // Options button
    let optionsButton = buildSmallIconButton("Options", "options.png");
    optionsButton.classList.add("foreground");
    optionsButton.addEventListener("click", function (event) {
        buildDropdown(event, [
            buildDropdownOption("trash.png", "Remove Song", function () {
                removeSongFromCurrentPlaylist(songMetadata);
            }),
            buildDropdownOption("share.png", "Share", function () {
                shareSong(songMetadata);
            }),
            buildDropdownOption("info.png", "Song Info", function (event) {
                showSongInfo(songMetadata, event, true);
            })
        ]);
    });

    resultInfoContainer.appendChild(optionsButton);
    result.appendChild(resultInfoContainer);

    // Result template
    return result;
}

// Removes the specified song from the current playlist and re displays everything
function removeSongFromCurrentPlaylist(songMetadata) {
    let songs = playlistData.songs;

    for (let i = 0; i < songs.length; i++) {
        if (songs[i].id === songMetadata.id) {
            songs.splice(i, 1);

            if (playlistData.currentSongId === songMetadata.id) { // Removed the current song
                if (!!playlistData.newPlaylist && songs.length === 0) { // No songs left in the user created playlist
                    closeCurrentTab();
                    return;
                }

                // Move on to the next song - or the previous if already at the last
                if (songs.length === 0) {
                    delete playlistData.currentSongId;
                    deactivateSong();
                } else {
                    playlistData.currentSongId = songs[(i === songs.length) ? i - 1 : i].id;
                    songData = getSongFromPlaylist(playlistData.currentSongId);
                    showNewSong();
                }

            }

            if (!!playlistData.newPlaylist) {
                playlistData.playlistLink = null;
            }

            saveTabs();
            buildPlaylistItems();
            return;
        }
    }
}


//*****************************
// Playlist Info
//*****************************

// Shows the playlist info in the bottom left of the screen
function showPlaylistInfo(playlistMetadata) {
    // Get Songs metadata for playlist
    fetch(dbUrl + "/playlistSongsMetadata", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(playlistMetadata.songIds)
    }).then(response => response.json()).then(responseJson => {
        if (noDBConnection(responseJson) || responseJson.title === "Not Found") {
            goOffline();
            return;
        }

        playlistMetadata.songs = responseJson;

        // Show the playlist:
        // Playlist Name
        get("playlistName").innerHTML = playlistMetadata.playlistName;
        get("playlistName").onclick = function () {
                viewPlaylist(playlistMetadata);
        };

        // YouTube Link - Required in databse
        get("playlistLink").href = buildPlaylistLinkUrl(playlistMetadata);

        // Share Button
        get("sharePlaylist").onclick = function () {
            let shareUrl = homeUrl + "/databaseView.html?playlistName=" + playlistMetadata.playlistName;

            navigator.share({
                title: "Playlist - " + playlistMetadata.playlistName,
                url: shareUrl
            });
        };

        // Songs
        let songs = get("playlistSongs");
        removeChildren(songs);

        resultNumber = 0;
        let songsIds = [];
        playlistMetadata.songs.forEach(songMetadata => {
            songsIds.push(songMetadata.id);
            songs.appendChild(buildPlaylistResultInfo(songMetadata, playlistMetadata));
        });

        // Translate
        translateNodeToCurrentLanguage(get("playlistInfo"));

        // Unhide the playlist info
        get("playlistInfo").classList.remove("hidden");
    });
}

// Builds and returns a single playlist info result on the songs page
function buildPlaylistResultInfo(songMetadata, playlistMetadata) {
    resultNumber++;
    let result = make("div");
    result.classList.add("result");

    // Number/Playing
    result.appendChild(build({
        type: "span",
        class: "songLabel",
        child: build({
            type: "span",
            innerHTML: (resultNumber + "."),
            class: "songNumber"
        })
    }));

    // On click
    result.addEventListener("click", function () {
        if (!clickedOnClass(event, "smallIconButton")) {
            playlistMetadata.currentSongId = songMetadata.id;
            viewPlaylist(playlistMetadata);
        }
    });

    // Song name
    let songNameSpan = make("span");
    songNameSpan.classList.add("resultTitle");
    songNameSpan.innerHTML = songMetadata.songName;

    let songNameContainer = buildSongLink("note.png", "Note", songNameSpan, "Song: " + songMetadata.songName);

    songNameContainer.classList.add("songNameContainer");
    result.appendChild(songNameContainer);

    addMiddleClickEvent(songNameSpan, function () {
        viewSongInNewTab(songMetadata.id);
    });

    // Result Info
    let resultInfoContainer = make("div");
    resultInfoContainer.classList.add("resultInfoContainer");

    // YouTube
    if (!!songMetadata.songLink) {
        let ytLink = buildSmallIconButton("YouTube", "YouTube.png");
        ytLink.classList.add("ytIcon");
        ytLink.addEventListener("click", function () {
            openInNewTab(songMetadata.songLink);
        });

        resultInfoContainer.appendChild(ytLink);
    }

    // Options button
    let optionsButton = buildSmallIconButton("Options", "options.png");
    optionsButton.addEventListener("click", function (event) {
        buildDropdown(event, [
            buildDropdownOption("share.png", "Share", function () {
                shareSong(songMetadata);
            }),
            buildDropdownOption("info.png", "Song Info", function (event) {
                showSongInfo(songMetadata, event, true);
            })
        ]);
    });

    resultInfoContainer.appendChild(optionsButton);
    result.appendChild(resultInfoContainer);

    // Result template
    return result;
}


//*****************************
// Drag Sortable
//*****************************
var groupContainer;

// Sets up the sortable playlist results
function setupSortableGroup(container) {
    groupContainer = container;
    Array.from(container.children).forEach(item => {
        item.setAttribute('draggable', true);
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragend', dragEnd);
        item.addEventListener('drop', cancelDefault);
        item.addEventListener('dragenter', dragEnter);
        item.addEventListener('dragover', cancelDefault);
    });
}

// Playlist dragging events...
var draggingElement;
function dragStart(event) {
    draggingElement = this;
    event.dataTransfer.effectAllowed = "move";
    setTimeout(function () {
        draggingElement.classList.add("dragging");
    }, 1);
}

function dragEnd() {
    this.classList.remove("dragging");
    if (!!playlistData.newPlaylist) {
        playlistData.playlistLink = null;
    }
    saveTabs();
    buildPlaylistItems();
}

function dragEnter(e) {
    cancelDefault(e);

    if (!draggingSong || this === draggingElement) {
        return;
    }

    let groupElements = Array.from(groupContainer.children);

    // Get new and old index
    let oldIndex = getELementIndex(draggingElement, groupElements);
    let newIndex = getELementIndex(this, groupElements);

    // remove dropped items at old place
    draggingElement.remove();

    // insert the dropped items at new place
    if (newIndex < oldIndex) {
        groupContainer.insertBefore(draggingElement, groupElements[newIndex]);
    } else {
        groupContainer.insertBefore(draggingElement, groupElements[newIndex + 1]);
    }

    // Reorder the data 
    let songs = playlistData.songs;
    let temp = songs[oldIndex];
    songs[oldIndex] = songs[newIndex];
    songs[newIndex] = temp;
}

function getELementIndex(element, nodes) {
    for (let i = 0; i < nodes.length; i++) {
        if (element === nodes[i]) {
            return i;
        }
    }

    return -1;
}

function cancelDefault(e) {
    e.preventDefault()
    e.stopPropagation()
    return false
}
