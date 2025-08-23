var prefix = window.location.origin.includes("local") ? "" : "https://thecabinet20230725181154.azurewebsites.net";
var mainUrl = prefix + "/api/ChordChart";
var dbUrl = prefix + "/api/Songs";

var pageName = getPageName();
function getPageName() {
    if (window.location.pathname.endsWith(".html")) return window.location.pathname.substring(1, window.location.pathname.length - 5);
    else return window.location.pathname.substring(1, window.location.pathname.length);
}

function usingSpanish() {
    return language == "Spanish";
}

//*****************************
// Utility
//*****************************

// Gets an element by id
function get(id) {
    return document.getElementById(id);
}

// Returns an array of all elements matching the selector
function getAll(selector) {
    return Array.from(document.querySelectorAll(selector));
}

// Returns the first element matching the selector
function getFirst(selector) {
    return document.querySelector(selector);
}

// Returns an array of all elements of the specified class
function getAllClass(className) {
    return Array.from(document.getElementsByClassName(className));
}

// Removes all children from an html element
function removeChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Applies a function to all elements of a certain class
function forEachClassElement(className, callback) {
    getAllClass(className).forEach(element => {
        callback(element);
    });
}

// Applies a function to all elements of a certain class
function forEachElement(selector, callback) {
    Array.from(document.querySelectorAll(selector)).forEach(function (element) {
        callback(element);
    });
}

// Checks if an event clicked on the specified element
function clickedOn(event, id) {
    return event.target.closest("#" + id) === get(id);
}

// Checks if an event clicked on the specified element
function clickedOnClass(event, className) {
    return !!event.target.closest("." + className);
}

// Creates a choice group of elements with the specified seletor
// The click element will become "chosen" and trigger an event
function setUpChoiceGroup(selector, callback) {
    let elements = Array.from(document.querySelectorAll(selector));

    elements.forEach(function (element) {
        element.addEventListener("click", function () {
            elements.forEach(function (item) {
                item.classList.remove("chosen");
            });

            this.classList.add("chosen");
            callback(element);
        });
    });
}

// Executes a parameter-less function when the element is middle clicked
function addMiddleClickEvent(element, callback) {
    element.addEventListener('mousedown', event => {
        if (event.which === 2) {
            event.preventDefault();
            callback(event);
        }
    });
}


// Opens a url in a new tab
function openInNewTab(url) {
    let anchor = make("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.click();
}

// Scrolls smoothly to the top of the screen
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

//*****************************
// Builders
//*****************************

// Creates an element of the specified type
function make(elementType) {
    return document.createElement(elementType);
}

// Builds and returns an element
function build(properties) {
    let element = document.createElement(properties.type);

    if (!!properties.class) {
        element.classList.add(properties.class);
    } else if (!!properties.classes) {
        properties.classes.forEach(elementClass => element.classList.add(elementClass));
    }

    if (!!properties.id) {
        element.id = properties.id;
    }

    if (!!properties.title) {
        element.title = properties.title;
    }

    if (!!properties.innerHTML) {
        element.innerHTML = properties.innerHTML;
    }

    if (!!properties.child) {
        element.appendChild(properties.child);
    } else if (!!properties.children) {
        properties.children.forEach(child => element.appendChild(child));
    }

    if (!!properties.onclick) {
        element.addEventListener("click", properties.onclick);
    }

    return element;
}

function buildTextInput(properties) {
    // Requires 'type'
    properties.type = "input";
    let textInput = build(properties);
    textInput.type = "text";
    textInput.classList.add("hoverInput");

    if (!!properties.value) {
        textInput.value = properties.value;
    }

    if (!properties.noEvents) {
        textInput.addEventListener("keydown", event => {
            switch (event.key) {
                case "Escape":
                    if (!!properties.onEscape) {
                        properties.onEscape(textInput);
                    }
                    textInput.blur();
                    return;
                case "Enter":
                    if (!!properties.onEnter) {
                        properties.onEnter(textInput);
                    }
                    textInput.blur();
                    return;
            }
        });
    }

    return textInput;
}

function buildImage(properties) {
    // Requires 'src'

    properties.type = "img";
    let img = build(properties);

    img.src = "imgs/icons/" + properties.src;

    if (!!properties.alt) {
        img.alt = properties.alt;
    } else {
        img.alt = properties.src.split('.')[0];
    }

    return img;
}

// Builds a dropdown option element
function buildDropdownOption(imgSrc, text, onSelect) {
    return build({
        type: "div",
        class: "dropdownOption",
        onclick: onSelect,
        children: [
            buildImage({
                src: imgSrc
            }),
            build({
                type: "span",
                innerHTML: text
            })
        ]
    });
}

// Builds and displays a dropdown
function buildDropdown(event, optionElements, floatRight) {
    let dropdown = build({
        type: "div",
        class: "dropdown",
        children: optionElements
    });

    // Destroying the dropdown
    let selfDestruct = function () {
        if (document.body.contains(dropdown)) {
            document.body.removeChild(dropdown);
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

    dropdown.style.top = (event.clientY + window.pageYOffset - 10) + "px";

    // Translate
    translateNodeToCurrentLanguage(dropdown);

    document.body.appendChild(dropdown);
}

// Build an image link on a song result
function buildSongLink(src, alt, data, title) {
    let songLink = make("div");
    songLink.title = title;
    songLink.classList.add("songLink");
    let linkImg = make("img");
    linkImg.src = "imgs/icons/" + src;
    linkImg.alt = alt;
    songLink.appendChild(linkImg);
    songLink.appendChild(data);
    return songLink;
}

//*****************************
// Searching
//*****************************

// checks for a no db connection error
function noDBConnection(response) {
    return response.status === 503;
}

// Sets up a search using text from the search bar and sends you to the search page
function search() {
    sessionStorage.setItem("search", get("searchInput").value);
    handleSearchRequest();
}

// Sends the user to the songs page with a prompt - action to be completed at once there
function promptToSongs(prompt) {
    sessionStorage.setItem("prompt", prompt);
    window.location.href = "databaseSongs.html";
}

// Clears all saved search data
function clearSearchData() {
    sessionStorage.removeItem("search");
    clearRefineSearchData();
}

// Clears all saved search options
function clearRefineSearchData() {
    sessionStorage.removeItem("resultTypeSearch");
    sessionStorage.removeItem("languageSearch");
    sessionStorage.removeItem("styles");
    sessionStorage.removeItem("lyricsSearch");
}

// Searching events
function loadSearchEvents(getFullSongResults) {
    get("searchButton").addEventListener("click", function () {
        if (onHomePage() && numResults == 0) {
            get("searchInput").focus();
            return;
        }

        search();
    });

    searchInput.addEventListener("focus", event => {
        searchInput.select();
        if (numResults > 0) get("searchContainer").classList.add("hasResults");
        get("searchBar").classList.add("focused");
        get("searchResults").classList.remove("hidden");
    });

    searchInput.addEventListener("blur", function () {
        get("searchBar").classList.remove("focused");
        get("searchContainer").classList.remove("hasResults");
        get("searchResults").classList.add("hidden");
    });

    searchInput.addEventListener("keydown", function (event) {
        let hoverDirection = 1;

        switch (event.key) {
            case "Escape":
                this.value = "";
                return;
            case "Enter":
                search();
                this.blur();
                return;
            case "ArrowUp": // Drop down scrolling
                hoverDirection = -1;
            case "ArrowDown":
                if (numResults === 0) {
                    return;
                }

                // Clear old hovering
                if (currentHovering >= 0) {
                    getDropdownResult(currentHovering).classList.remove("hovering");
                }

                // Move to bottom result when moving up from search
                if (currentHovering === -1 && hoverDirection === -1) {
                    currentHovering = 0;
                }

                // Move hover to next item
                currentHovering += hoverDirection;
                if (currentHovering >= numResults) {
                    currentHovering -= numResults;
                }
                if (currentHovering < 0) {
                    currentHovering += numResults;
                }

                let result = getDropdownResult(currentHovering);
                result.classList.add("hovering");

                // Put the value into the search
                this.value = result.name;
                return;
        }
    });

    if (!!getFullSongResults) {
        searchInput.addEventListener("input", updateSearchResults);
    } else {
        searchInput.addEventListener("input", updateSearchResultsForDBPage);
    }
}


//*****************************
// Search Results Dropdown
//*****************************
var currentHovering = -1;
var numResults = 0;
var loadingInitialSearchResults = false;

// Gets the specified dropdown result element
function getDropdownResult(resultNumber) {
    return get("searchResults").childNodes[resultNumber];
}

// Updates search dropdown with songs results using the search input
// Used exclusively on the home page
function updateSearchResults(event) {
    let searchText = get("searchInput").value;
    let resultsDiv = get("searchResults");

    if (searchText.length === 0) {
        removeChildren(resultsDiv);
        get("searchContainer").classList.remove("hasResults");
        numResults = 0;
        loadingInitialSearchResults = false;
        return;
    }

    // Placeholder - loading results on initial search
    if (numResults == 0 && !loadingInitialSearchResults) {
        loadingInitialSearchResults = true;
        let result = make("div");
        result.classList.add("searchResult");

        let iconContainer = make("div");
        iconContainer.classList.add("centerItems");
        result.appendChild(iconContainer);
        let icon = make("img");
        icon.src = "imgs/icons/note.png";
        iconContainer.appendChild(icon);

        let nameDiv = make("div");
        result.appendChild(nameDiv);
        nameDiv.innerHTML = usingSpanish() ? "Buscando..." : "Searching...";

        removeChildren(resultsDiv);
        resultsDiv.appendChild(result);
        get("searchContainer").classList.add("hasResults");
    }

    // Search!
    fetch(dbUrl + "/search",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                searchText: searchText,
                language: language,
                token: localStorage.getItem("token"),
            })
        }
    ).then(response => response.json()).then(responseJson => {
        removeChildren(resultsDiv);
        currentHovering = -1;
        loadingInitialSearchResults = false;

        // Could not connect to db
        if (noDBConnection(responseJson)) {
            let result = make("div");
            result.classList.add("searchResult");

            let iconContainer = make("div");
            iconContainer.classList.add("centerItems");
            result.appendChild(iconContainer);
            let icon = make("img");
            icon.src = "imgs/icons/noResults.png";
            iconContainer.appendChild(icon);

            let nameDiv = make("div");
            result.appendChild(nameDiv);
            nameDiv.innerHTML = "Unable to connect";

            resultsDiv.appendChild(result);
            get("searchContainer").classList.add("hasResults");
            return;
        }

        numResults = responseJson.length;

        if (numResults === 0) {
            showNoResults();
            return;
        } else if (!resultsDiv.classList.contains("hidden")) {
            get("searchContainer").classList.add("hasResults");
        }

        // The current result number
        let resultNumber = 0;

        // Display results
        responseJson.forEach(function (songEntity) {
            // Song Title
            let songTitle = songEntity.songName;

            // - Replace accents to...
            let simplifiedSongTitle = songTitle.toLowerCase().replaceAll('�', 'n').replaceAll('�', 'a').replaceAll('�', 'e').replaceAll('�', 'i').replaceAll('�', 'o').replaceAll('�', 'u').replaceAll('�', 'u');

            // - Bold all search string matches
            simplifiedSongTitle = simplifiedSongTitle.replace(new RegExp("(" + searchText + ")", "ig"), "<strong-$1>/strong-");

            for (let i = 0; i < simplifiedSongTitle.length; i++) {
                switch (simplifiedSongTitle.charAt(i)) {
                    case '<':
                        songTitle = [songTitle.slice(0, i), "<strong>", songTitle.slice(i)].join('');
                        i += 7;
                        break;
                    case '>':
                        songTitle = [songTitle.slice(0, i), "</strong>", songTitle.slice(i)].join('');
                        i += 8;
                        break;
                }
            }

            // Set result name
            let result = build({
                type: "div",
                class: "searchResult",
                children: [
                    build({
                        type: "div",
                        class: "centerItems",
                        child: buildIcon("note.png")
                    }),
                    build({
                        type: "div",
                        innerHTML: songTitle
                    })/*,
                    build({
                        type: "span",
                        innerHTML: (!!songEntity.artist ? (usingSpanish() ? "por " : "by ") + songEntity.artist : "-")
                    })*/
                ]
            });

            // Search on click
            result.addEventListener("mousedown", function () {
                window.location.href = (usingSpanish() ? "imprimir" : "print") + "?song_id=" + songEntity.id;
            });

            result.name = songEntity.songName;
            result.dataset.songId = songEntity.id;
            resultsDiv.appendChild(result);
        });

        trySelectFirstOption(event);
    });
}

// Updates search dropdown with songs name, artists, and playlist results using the search input
function updateSearchResultsForDBPage(event) {
    let searchText = get("searchInput").value;
    let resultsDiv = get("searchResults");

    if (searchText.length === 0) {
        removeChildren(resultsDiv);
        get("searchContainer").classList.remove("hasResults");
        numResults = 0;
        loadingInitialSearchResults = false;
        return;
    }

    // Placeholder - loading results on initial search
    if (numResults == 0 && !loadingInitialSearchResults) {
        loadingInitialSearchResults = true;
        let result = make("div");
        result.classList.add("searchResult");

        let iconContainer = make("div");
        iconContainer.classList.add("centerItems");
        result.appendChild(iconContainer);
        let icon = make("img");
        icon.src = "imgs/icons/note.png";
        iconContainer.appendChild(icon);

        let nameDiv = make("div");
        result.appendChild(nameDiv);
        nameDiv.innerHTML = usingSpanish() ? "Buscando..." : "Searching...";

        removeChildren(resultsDiv);
        resultsDiv.appendChild(result);
        get("searchContainer").classList.add("hasResults");
    }

    // Get a list of matching song names
    let url = !!limitToCurrentLanguage ?
        dbUrl + "/songNames/" + language + "/" + searchText :
        dbUrl + "/songNames/" + searchText;


    fetch(url).then(response => response.json()).then(responseJson => {
        removeChildren(resultsDiv);
        currentHovering = -1;
        loadingInitialSearchResults = false;

        // Could not connect to db
        if (noDBConnection(responseJson)) {
            let result = make("div");
            result.classList.add("searchResult");

            let iconContainer = make("div");
            iconContainer.classList.add("centerItems");
            result.appendChild(iconContainer);
            let icon = make("img");
            icon.src = "imgs/icons/noResults.png";
            iconContainer.appendChild(icon);

            let nameDiv = make("div");
            result.appendChild(nameDiv);
            nameDiv.innerHTML = "Unable to connect";

            resultsDiv.appendChild(result);
            get("searchContainer").classList.add("hasResults");
            return;
        }

        numResults = responseJson.length;

        if (numResults === 0) {
            get("searchContainer").classList.remove("hasResults");
            return;
        } else if (!resultsDiv.classList.contains("hidden")) {
            get("searchContainer").classList.add("hasResults");
        }

        // The current result number
        let resultNumber = 0;

        // Display results
        responseJson.forEach(function (resultEntity) {
            let resultValue = resultEntity.resultValue;

            let result = make("div");
            result.name = resultValue;
            result.classList.add("searchResult");

            let iconContainer = make("div");
            iconContainer.classList.add("centerItems");
            result.appendChild(iconContainer);
            let icon = make("img");

            switch (resultEntity.resultType) {
                case "song":
                    icon.src = "imgs/icons/note.png";
                    break;
                case "artist":
                    icon.src = "imgs/icons/artist.png";
                    break;
                case "playlist":
                    icon.src = "imgs/icons/playlist.png";
                    break;
            };

            iconContainer.appendChild(icon);

            let nameDiv = make("div");
            result.appendChild(nameDiv);

            // Display the title
            let songTitle = resultValue;

            // - Replace accents to...
            let simplifiedSongTitle = songTitle.toLowerCase().replaceAll('�', 'n').replaceAll('�', 'a').replaceAll('�', 'e').replaceAll('�', 'i').replaceAll('�', 'o').replaceAll('�', 'u').replaceAll('�', 'u');

            // - Bold all search string matches
            simplifiedSongTitle = simplifiedSongTitle.replace(new RegExp("(" + searchText + ")", "ig"), "<strong-$1>/strong-");

            for (let i = 0; i < simplifiedSongTitle.length; i++) {
                switch (simplifiedSongTitle.charAt(i)) {
                    case '<':
                        songTitle = [songTitle.slice(0, i), "<strong>", songTitle.slice(i)].join('');
                        i += 7;
                        break;
                    case '>':
                        songTitle = [songTitle.slice(0, i), "</strong>", songTitle.slice(i)].join('');
                        i += 8;
                        break;
                }
            }

            // Set result name
            nameDiv.innerHTML = songTitle;

            // Search on click
            result.addEventListener("mousedown", function () {
                currentHovering = this.dataset.resultNumber;
                get("searchInput").value = resultValue;
                search();
            });

            // Result Number
            result.dataset.resultNumber = resultNumber++;

            resultsDiv.appendChild(result);
        });

        if (onHomePage()) {
            trySelectFirstOption(event);
        }
    });
}

function onHomePage() {
    return pageName == "/" || pageName == "home";
}

function trySelectFirstOption(event) {
    if (currentHovering != -1) return;
    let searchInput = get("searchInput");
    let result = getDropdownResult(0);
    let resultName = result.name;

    // Move hover to first item
    currentHovering = 0;
    result.classList.add("hovering");

    // Return if deleting or if the result doesn't match
    if (event.inputType == "deleteContentBackward" || !resultName.toLowerCase().startsWith(searchInput.value.toLowerCase())) return;

    // Otherwise put the value into the search
    let startIndex = searchInput.value.length;
    searchInput.value = result.name;
    createSelection(searchInput, startIndex, result.name.length);
    return;
}

function createSelection(field, start, end) {
    if (field.createTextRange) {
        var selRange = field.createTextRange();
        selRange.collapse(true);
        selRange.moveStart('character', start);
        selRange.moveEnd('character', end);
        selRange.select();
    } else if (field.setSelectionRange) {
        field.setSelectionRange(start, end);
    } else if (field.selectionStart) {
        field.selectionStart = start;
        field.selectionEnd = end;
    }
}

function showNoResults() {
    let resultsDiv = get("searchResults");

    let result = make("div");
    result.classList.add("searchResult");

    let iconContainer = make("div");
    iconContainer.classList.add("centerItems");
    result.appendChild(iconContainer);
    let icon = make("img");
    icon.src = "imgs/icons/noResults.png";
    iconContainer.appendChild(icon);

    let nameDiv = make("div");
    nameDiv.innerHTML = usingSpanish() ? "No Resultados" : "No Results";
    result.appendChild(nameDiv);
    resultsDiv.appendChild(result);

    // Show the dropdown
    resultsDiv.classList.remove("hidden");
    get("searchContainer").classList.add("hasResults");
}
