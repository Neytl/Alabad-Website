
// Before the page is loaded
document.addEventListener("DOMContentLoaded", function () {
    loadGeneralPageStuff();
});

// After first paint
window.addEventListener("load", function () {
    loadGeneralUserEvents();

    // Quick Links
    get("uploadLink").addEventListener("click", chooseFile);

    get("pasteLink").addEventListener("click", newSongFromClipbaord);

    get("unfinishedSongsLink").addEventListener("click", function () {
        sessionStorage.setItem("incompleteSongs", "true");
        window.location.href = "databaseSongs.html";
    })

    get("testsLink").addEventListener("click", function () {
        fetch(dbUrl + "/runKeyAlgorithmTests").then(response => response.json()).then(result => {
            alert(result);
        });
    });

    // Email select
    get("email").addEventListener("click", () => selectText("email"));

    loadingPage = false;
});

// Returns a playlist prompt link
function buildPlaylistLink(playlistName) {
    return build({
        type: "div",
        classes: ["promptLink", "noTranlation"],
        onclick: function () {
            window.location.href = "databaseView.html?playlistName=" + playlistName;
        },
        children: [
            buildImage({
                src: "playlist.png"
            }),
            build({
                type: "span",
                innerHTML: playlistName
            })
        ]
    });
}

// Selects all text in the container
function selectText(containerid) {
    if (document.selection) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
}

// Go to view with the specified prompt
function promptToView(prompt) {
    sessionStorage.setItem("prompt", prompt);
    goToView();
}

// What to do after a search is stored and requested
function handleSearchRequest() {
    window.location.href = "databaseSongs.html";
}

// Go to view after upload
function handleNewSong() {
    goToView();
}
