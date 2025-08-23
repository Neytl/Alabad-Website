// Browse Counts
async function testConnection() {
    let result = await fetch(dbUrl + "/testConnection");
    console.log(result);
}

var browseCounts;
function loadBrowseCounts() {
    browseCounts = JSON.parse(localStorage.getItem("browseCounts"));

    if (!!browseCounts) {
        get("numSongs").innerHTML = "(" + browseCounts.Songs + ")";
        get("numPraiseSongs").innerHTML = "(" + browseCounts.PraiseSongs + ")";
        get("numWorshipSongs").innerHTML = "(" + browseCounts.WorshipSongs + ")";
    } else {
        browseCounts = {};
        loadBrowseCount(""); // All Songs
        loadBrowseCount("Praise");
        loadBrowseCount("Worship");
    }
}

function loadBrowseCount(style) {
    let searchEntity = {};
    searchEntity.language = "Spanish";
    if (!!style) {
        searchEntity.styles = [style];
    }

    fetch(dbUrl + "/numberOfResults",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(searchEntity)
        }
    ).then(response => response.json()).then(numResults => {
        if (!!numResults.status) return; // Connection Error
        get("num" + style + "Songs").innerHTML = "(" + numResults + ")";
        browseCounts[style + "Songs"] = numResults;
        localStorage.setItem("browseCounts", JSON.stringify(browseCounts));
    });
}

function refreshTheDatabase() {
    localStorage.removeItem("browseCounts");
    loadBrowseCounts();

    fetch(dbUrl + "/refreshDropdownService",
        {
            method: "PATCH"
        }
    ).then(response => {
        if (noDBConnection(response)) {
            alert("Could not connect");
            return;
        }

        get("refreshDatabaseButton").classList.add("hidden");
    });
}

// ***************

var noResults = false;
var resultsSort = "Relevance";
var alphaDirection = "Down";

// Elements containing sorted results
var relavanceSortedResults;
var alphSortedResults;

// Before the page is loaded
document.addEventListener("DOMContentLoaded", function () {
    loadBrowseCounts();
    loadGeneralPageStuff();
});

// After first paint
window.addEventListener("load", function () {
    loadGeneralUserEvents();
    setUpSortingEvents(); // Relevance/Alphabetical sort

    // Back to Top button
    let backToTopButton = get("backToTopButton");

    window.addEventListener("scroll", function () {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            backToTopButton.classList.remove("hidden");
        } else {
            backToTopButton.classList.add("hidden");
        }
    });

    backToTopButton.addEventListener("click", scrollToTop);

    // Close playlist info button
    get("closePlaylistInfoButton").addEventListener("click", () => get("playlistInfo").classList.add("hidden"));

    // Load Refine Search Events
    loadRefineSearch();

    // Browsing
    setUpBrowsing("browseAllSongs", function () {
        get("songTypeRefine").click();
        get("spanishRefine").click();
    });

    setUpBrowsing("browsePraiseSongs", function () {
        get("songTypeRefine").click();
        get("spanishRefine").click();
        get("PraiseStyleCB").click();
    });

    setUpBrowsing("browseWorshipSongs", function () {
        get("songTypeRefine").click();
        get("spanishRefine").click();
        get("WorshipStyleCB").click();
    });

    // Refresh DB button
    get("refreshDatabaseButton").addEventListener("click", refreshTheDatabase);

    // Search for incomplete songs
    if (!!sessionStorage.getItem("incompleteSongs")) {
        sessionStorage.removeItem("incompleteSongs");
        searchIncompleteSongs();
        loadingPage = false;
        return;
    }

    // Action based on how page was entered
    switch (sessionStorage.getItem("prompt")) {
        case "searchPrompt": // Through home page prompt
            clearSearchData();
            searchError("Waiting on search...");
            sessionStorage.removeItem("prompt");
            setUpInfoPrompt("searchBar");
            setUpInfoPrompt("refineSearchButton");
            break;
        case "translations": // Through home page prompt
            setUpInfoPrompt("searchButton");
            clearSearchData();
            get("searchInput").value = "*Mighty to Save";
            search();
            break;
        default: // Through search button or back button or refresh
            loadSavedSearchOptions();
            loadResults();
            break;
    }

    loadingPage = false;
});


// Sets up a browsing link to show specified songs on click
function setUpBrowsing(linkId, setUpFilters) {
    get(linkId).addEventListener("click", function () {
        loadingSearchOptions = true;
        clearRefineSearch();
        sessionStorage.removeItem("search");
        get("searchInput").value = "";
        setUpFilters();
        loadingSearchOptions = false;
        loadResults();
    });
}

//*****************************
// Onload Events
//*****************************

// Loads the saved search options and builds refine search tags
var loadingSearchOptions;
function loadSavedSearchOptions() {
    loadingSearchOptions = true;
    get("searchInput").value = sessionStorage.getItem("search");

    let resultType = sessionStorage.getItem("resultTypeSearch");
    if (!!resultType) {
        if (resultType === "Songs") {
            checkCheckbox("songTypeRefine");
        } else if (resultType === "Artists") {
            checkCheckbox("artistTypeRefine");
        } else {
            checkCheckbox("playlistTypeRefine");
        }
    }


    let language = sessionStorage.getItem("languageSearch");
    if (!!language) {
        if (language === "English") {
            checkCheckbox("englishRefine");
        } else {
            checkCheckbox("spanishRefine");
        }
    }

    let styles = JSON.parse(sessionStorage.getItem("styles"));
    if (!!styles) {
        styles.forEach(function (styleName) {
            checkCheckbox(styleName + "StyleCB");
        });
    }

    let lyrics = sessionStorage.getItem("lyricsSearch");
    if (!!lyrics) {
        get("refineLyricsSearch").value = lyrics;
        checkCheckbox("refineLyricsCB");
    }

    // Default to only Spanish songs if no search options
    /*    if (!resultType && !language && !styles && !lyrics) {
            checkCheckbox("spanishRefine");
        }*/

    loadingSearchOptions = false;
}

// Sets a checkbox to 'checked' and triggers 'on change' event
function checkCheckbox(checkboxId) {
    let checkbox = get(checkboxId);
    checkbox.checked = false;
    checkbox.click();
}

// Setup buttons for displaying different sortings
function setUpSortingEvents() {
    // Sorting Results
    get("relevance").addEventListener("click", sortByRelavance);
    get("alphabetical").addEventListener("click", sortByAlpha);
}

// Sort results alphabetically - flips between A-Z and Z-A
function sortByAlpha() {
    // Switch from relavance to alphabetical sorting styles
    if (resultsSort !== "Alphabetical") {
        resultsSort = "Alphabetical";
        get("relevance").classList.remove("pickedSort");
        get("alphabetical").classList.add("pickedSort");

        if (!noResults) {
            relavanceSortedResults.classList.add("hidden");
            alphSortedResults.classList.remove("hidden");
        }
    } else if (alphaDirection === "Down") {
        // Sort by alphabetical reversed
        alphaDirection = "UP";
        get("alphaArrow").innerHTML = "▲";

        if (!noResults) {
            alphSortedResults.classList.add("reversed");
        }
        return;
    }

    // Sort by alphabetical
    alphaDirection = "Down";
    get("alphaArrow").innerHTML = "▼";

    if (!noResults) {
        alphSortedResults.classList.remove("reversed");
    }
}

// Sort results by relavance
function sortByRelavance() {
    if (resultsSort === "Relevance") {
        return;
    }

    // Indicate sorted by relevance
    resultsSort = "Relevance";
    get("alphaArrow").innerHTML = "";
    get("alphabetical").classList.remove("pickedSort");
    get("relevance").classList.add("pickedSort");

    // Display correct results
    if (!noResults) {
        relavanceSortedResults.classList.remove("hidden");
        alphSortedResults.classList.add("hidden");
    }
}


//*****************************
// Refine Search
//*****************************

// Loads all events for the refine search button
function loadRefineSearch() {
    // Open/Close dropdown
    get("refineSearchButton").addEventListener("click", function () {
        get("refineSearchDropdown").classList.remove("hidden");
        document.body.classList.add("locked");
    });

    let closeRefineSearch = function () {
        get("refineSearchDropdown").classList.add("hidden");
        document.body.classList.remove("locked");
    }

    get("collapseRefineSearchButton").addEventListener("click", closeRefineSearch);
    get("darkOut").addEventListener("click", closeRefineSearch);

    // Expand/Collapse sections
    forEachClassElement("refineSearchTitle", function (element) {
        element.addEventListener("click", function () {
            // Add "expanded" class and update arrow
            if (this.parentNode.classList.toggle("expanded")) {
                this.childNodes[3].innerHTML = "˄";
            } else {
                this.childNodes[3].innerHTML = "˅";
            }
        });
    });

    // - whenever a row is clicked, check its checkbox
    forEachElement(".expandable > .refineSearchBox", function (element) {
        element.addEventListener("click", function (event) {
            if (clickedOn(event, "refineLyricsSearch")) {
                return;
            }

            let checkbox = this.childNodes[3];
            checkBoxList.push(checkbox);
            checkbox.click();
        });
    });

    // Refine Result type
    addResultTypeCheckboxEvents("anyTypeRefine", false);
    addResultTypeCheckboxEvents("songTypeRefine", "Songs");
    addResultTypeCheckboxEvents("artistTypeRefine", "Artists");
    addResultTypeCheckboxEvents("playlistTypeRefine", "Playlists");

    // Refine Language 
    addLanguageCheckboxEvents("anyLanguageRefine", false);
    addLanguageCheckboxEvents("englishRefine", "English");
    addLanguageCheckboxEvents("spanishRefine", "Spanish");

    // Refine Styles
    forEachElement("#stylesExpandable input", function (checkbox) {
        checkbox.addEventListener("change", function () {
            let styleName = this.dataset.styleType;
            if (this.checked) {
                // Add a style
                let addedStyle = addRefineTag("Style", styleName, function () {
                    checkbox.checked = false;
                    styleTags.delete(styleName);
                    loadNewStyles();
                });

                // Store new active tag
                styleTags.set(styleName, addedStyle);
                loadNewStyles();
            } else {
                // Remove the active tag
                styleTags.get(styleName).remove();
                styleTags.delete(styleName);
                loadNewStyles();
                updateNumTags(-1);
            }
        });
    });

    // Refine Lyrics
    get("refineLyricsCB").addEventListener("change", function () {
        removeLyricsTag();

        if (!this.checked) {
            return;
        }

        const lyricsInput = get("refineLyricsSearch");

        if (!lyricsInput.value) {
            lyricsInput.focus();
            lyricsInput.select();
        } else {
            addLyricsTag();
        }
    });

    // - uncheck the checkbox if there are no lyrics, otherwise update the tag
    get("refineLyricsSearch").addEventListener("change", function () {
        removeLyricsTag();

        if (!this.value) {
            get("refineLyricsCB").checked = false;
        } else {
            get("refineLyricsCB").checked = true;
            addLyricsTag();
        }
    });

    get("refineLyricsSearch").addEventListener("keydown", function (event) {
        switch (event.key) {
            case "Escape":
                removeLyricsTag();
                this.value = "";
                return;
        }
    });

    // Reset Options button
    get("resetRefineSearchButton").addEventListener("click", clearRefineSearch);
}

// Check boxes
var checkBoxList = []; // All refine search check boxes

// Active tags
var languageTag = null;
var resultTypeTag = null;
var styleTags = new Map();
var lyricsTag = null;


// Adds events to a refine language checkbox being checked
function addResultTypeCheckboxEvents(cbName, newType) {
    let checkbox = get(cbName);

    checkbox.addEventListener("change", function () {
        if (this.checked) {
            // Clear other checkboxes
            get("anyTypeRefine").checked = false;
            get("songTypeRefine").checked = false;
            get("artistTypeRefine").checked = false;
            get("playlistTypeRefine").checked = false;
            checkbox.checked = true;

            // Remove the current language tag if exists
            if (!!resultTypeTag) {
                resultTypeTag.remove();
                resultTypeTag = null;
                updateNumTags(-1);
            }

            // Add a new language tag if specified
            if (!!newType) {
                sessionStorage.setItem("resultTypeSearch", newType);
                resultTypeTag = addRefineTag("Type", newType, function () {
                    resultTypeTag = null;
                    get("anyTypeRefine").click();
                });
            } else {
                sessionStorage.removeItem("resultTypeSearch");
            }

            loadResults();
        } else {
            // Can't uncheck an active choice - one choice must always be selected
            this.checked = true;
        }
    });
}

// Adds events to a refine language checkbox being checked
function addLanguageCheckboxEvents(cbName, language) {
    let checkbox = get(cbName);

    checkbox.addEventListener("change", function () {
        if (this.checked) {
            // Clear other checkboxes
            get("anyLanguageRefine").checked = false;
            get("spanishRefine").checked = false;
            get("englishRefine").checked = false;
            checkbox.checked = true;

            // Remove the current language tag if exists
            if (!!languageTag) {
                languageTag.remove();
                languageTag = null;
                updateNumTags(-1);
            }

            // Add a new language tag if specified
            if (!!language) {
                sessionStorage.setItem("languageSearch", language);
                languageTag = addRefineTag("Language", language, function () {
                    languageTag = null;
                    get("anyLanguageRefine").click();
                });
            } else {
                sessionStorage.removeItem("languageSearch");
            }

            loadResults();
        } else {
            // Can't uncheck an active choice - one choice must always be selected
            this.checked = true;
        }
    });
}

// Stores the new style tags and load the results
function loadNewStyles() {
    sessionStorage.setItem("styles", JSON.stringify(Array.from(styleTags.keys())));
    loadResults();
}

// Adds a refine lyrics using the lyrics input value
function addLyricsTag() {
    let lyrics = get("refineLyricsSearch").value;
    sessionStorage.setItem("lyricsSearch", lyrics);

    lyricsTag = addRefineTag("Lyrics", lyrics, function () {
        get("refineLyricsCB").checked = false;
        sessionStorage.removeItem("lyricsSearch");
        lyricsTag = null;
        loadResults();
    });

    loadResults();
}

// Removes the refine lyrics tag if it exists
function removeLyricsTag() {
    if (!!lyricsTag) {
        sessionStorage.removeItem("lyricsSearch");
        lyricsTag.remove();
        lyricsTag = null;
        loadResults();
        updateNumTags(-1);
    }
}

// Creates and adds a tag with the specified text, and executes a command when closed
// - retuns the tag element created
var numTags = 0;
function addRefineTag(type, value, command) {
    // The tag button
    let button = make("div");
    button.classList.add("refineTag");
    button.onclick = function () {
        command();
        button.remove();
        updateNumTags(-1);
    };

    // Text of the tag
    let text = "<span>" + type + "</span><span>: </span>";

    if (type === "Lyrics") {
        text += "<span class='noTranslation'>" + value + "</span>";
    } else {
        text += "<span>" + value + "</span>";
    }

    let textDiv = make("div");
    textDiv.innerHTML = text;
    button.appendChild(textDiv);

    translateNodeToCurrentLanguage(textDiv);

    // Close button
    let closeDiv = make("div");
    closeDiv.innerHTML = "✕";
    closeDiv.classList.add("removeRefineTag");
    button.appendChild(closeDiv);

    get("refineTags").appendChild(button);
    updateNumTags(+1);

    return button;
}

// Updates the number of tags and the refine button text
function updateNumTags(change) {
    if (change === 0) {
        numTags = 0;
    } else {
        numTags += change;
    }

    let buttonText = "<span>";

    if (usingSpanish()) {
        buttonText += "Refinar Busqueda</span>";
    } else {
        buttonText += "Refine Search</span>";
    }

    if (numTags > 0) {
        buttonText += "<span> (" + numTags + ")</span>";
    }

    get("refineSearchButton").innerHTML = buttonText;
}

// Clear the refine search
function clearRefineSearch() {
    // Uncheck everything
    checkBoxList.forEach(function (checkBox) {
        checkBox.checked = false;
    });

    // Check the "Any Type" checkbox
    get("anyTypeRefine").checked = true;

    // Check the "Any Language" checkbox
    get("anyLanguageRefine").checked = true;

    // Clear the refine lyrics search
    get("refineLyricsSearch").value = "";

    // Remove tags
    removeChildren(get("refineTags"));
    resultTypeTag = null;
    languageTag = null;
    styleTags = new Map();
    lyricsTag = null;

    // Update the button
    updateNumTags(0);

    // Reload Results
    clearRefineSearchData();
}


//*****************************
// Search Results
//*****************************

// Searches and displays the results
function loadResults() {
    if (loadingSearchOptions) {
        return;
    }

    // Build Search Entity
    let searchEntity = {};
    searchEntity.search = sessionStorage.getItem("search");
    searchEntity.resultType = sessionStorage.getItem("resultTypeSearch");
    searchEntity.language = sessionStorage.getItem("languageSearch");
    searchEntity.styles = JSON.parse(sessionStorage.getItem("styles"));
    searchEntity.lyricsSearch = sessionStorage.getItem("lyricsSearch");

    fetch(dbUrl + "/fullSearch",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(searchEntity)
        }
    ).then(response => response.json()).then(results => {
        displayResultsResponse(results);
    });
}

// Display error message or results
function displayResultsResponse(resultsResponse) {
    if (noDBConnection(resultsResponse)) {
        searchError("Could not connect to the database. Try again later...");
    } else if (resultsResponse.title === "Not Found") {
        searchError("No results found");
    } else {
        noResults = false;
        displayResults(resultsResponse);
    }

    translateNodeToCurrentLanguage(get("resultsContainer"));
    sessionStorage.removeItem("prompt");
}

// Displays search reults from a server response
function displayResults(results) {
    // Clear error message if there are results to display
    get("errorMessageDiv").innerHTML = "";

    // Build results elements and store each type of sorting
    relavanceSortedResults = make("div");
    alphSortedResults = make("div");
    alphSortedResults.id = "alphSortedResults";

    // Build relevance sorted results
    results.forEach(result => {
        relavanceSortedResults.appendChild(buildResult(result));
    });

    // Sort results by name then id
    results.sort(function (a, b) {
        if (a.resultValue === b.resultValue) {
            if (!!a.id && !!b.id) {
                return a.id - b.id;
            } else {
                return 0;
            }
        } else if (a.resultValue < b.resultValue) {
            return -1;
        } else {
            return 1;
        }
    });

    // Build alpha sorted results
    let currentLetter = "?";
    let currentDiv = make("div");
    results.forEach(result => {
        if (result.resultValue[0] !== currentLetter) {
            if (currentLetter !== "?") {
                alphSortedResults.appendChild(currentDiv);
            }

            currentDiv = make("div");

            currentLetter = result.resultValue[0];
            let fileLetter = make("div");
            fileLetter.classList.add("fileLetter");
            fileLetter.innerHTML = currentLetter;
            currentDiv.appendChild(fileLetter);
        }

        currentDiv.appendChild(buildResult(result));
    });

    alphSortedResults.appendChild(currentDiv);

    // Clear old results
    removeChildren(get("resultsDiv"));

    // Display number of results
    get("numberResults").innerHTML = results.length;
    get("resultsText").innerHTML = (results.length > 1) ? "results" : "result";
    get("numResultsDiv").classList.remove("hidden");

    // Append all sorted results as hidden
    relavanceSortedResults.classList.add("hidden");
    alphSortedResults.classList.add("hidden");
    get("resultsDiv").appendChild(relavanceSortedResults);
    get("resultsDiv").appendChild(alphSortedResults);

    // Display the results
    if (resultsSort === "Relevance") {
        relavanceSortedResults.classList.remove("hidden");
    } else {
        alphSortedResults.classList.remove("hidden");

        if (alphaDirection !== "Down") {
            alphSortedResults.classList.add("reversed");
        }
    }

    // Translations Prompt
    if (sessionStorage.getItem("prompt") === "translations") {
        setUpNewInfoPrompt(getFirst(".resultInfoContainer"), "Or find translations in here");
    }

    sessionStorage.removeItem("prompt");
}


//*****************************
// Other
//*****************************

// Adds an info prompt with the specified text to the specified button element
function setUpNewInfoPrompt(promptContainer, text) {
    // Build Prompt
    let prompt = make("div");
    prompt.classList.add("infoPrompt");
    prompt.classList.add("translationsButton");
    prompt.innerHTML = text;
    let arrow = make("div");
    arrow.classList.add("promptArrow");
    arrow.innerHTML = String.fromCharCode(10132);
    let container = make("div");
    container.classList.add("infoPromptContainer");
    container.appendChild(prompt);
    container.appendChild(arrow);
    promptContainer.appendChild(container);

    // Translate
    translateNodeToCurrentLanguage(prompt);

    // Activate Prompt
    document.addEventListener("click", function (event) {
        promptContainer.classList.remove("prompted");
        document.removeEventListener("click", event);
    });

    promptContainer.classList.add("prompted");
}

// Displays an error message in the results area
function searchError(message) {
    get("resultsDiv").innerHTML = "";
    get("errorMessageDiv").innerHTML = message;

    get("numResultsDiv").classList.add("hidden");
    noResults = true;
}

// Go to view after upload
function handleNewSong() {
    goToView();
}

// What to do after a search is stored and requested
function handleSearchRequest() {
    loadResults();
}

// Show all incomplete songs
function searchIncompleteSongs() {
    fetch(dbUrl + "/incompleteSongs").then(response => response.json()).then(results => {
        displayResultsResponse(results);
    });
}