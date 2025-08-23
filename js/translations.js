var language = "English";

var translationsData = [
    {
        pages: ["All"],
        tranlations: [
            // Nav
            ["Menu", "Menú"],
            ["Home", "Inicio"],
            ["Songs", "Canciónes"],
            ["More Tabs", "Más Pestañas"],
            // New Song
            ["New Song", "Nueva Canción"],
            ["Upload Song", "Sube Canción"],
            ["Use Copied Text", "Usa Texto Copiado"],
            ["Search For Song", "Busca Canción"],
            // General
            ["Search Christian Music", "Buscar Música Cristiana"],
            ["Search", "Buscar"],
        ]
    },
    {
        pages: ["databaseHome.html"],
        tranlations: [
            // Home
            ["The Cabinet", "El Gabinete"],
            // Top Quick Links
            ["Help", "Ayuda"],
            ["This Week's Top Songs", "Canciones Más Populares de la Semana"],
            ["About", "Sobre El Gabinete"],
            // Playlsit Links
            ["Share With a Friend", "Comparte con un Amigo"],
            ["Top Songs of 2023", "Canciones Más Populares de 2023"],
            ["More Playlists ➔", "Más Playlists ➔"],
            // About
            ["Every week, someone has to dig up the week's set out of a large file cabinet. The songs aren't always there, and finding the right chord chart for a new song can be difficult. Having trouble with your church's cabinet? This is the place to be!"
                , "Cada semana, alguien tiene que desenterrar el juego de la semana de un gran archivador. Las canciones no siempre están ahí, y encontrar la tabla de acordes correcta para una nueva canción puede ser difícil. ¿Tiene problemas con el gabinete de su iglesia? Este es el lugar para estar!"],
            ["Find the chord charts that work best for you of hundreds of Christians songs. Each song is carefully checked for accuracy, and comes with a YouTube video link of the song."
                , "Encuentra las tablas de acordes que funcionan mejor para ti de cientos de canciones cristianas. Cada canción se verifica cuidadosamente para verificar su precisión y viene con un enlace de video de YouTube de la canción."],
            // Help
            ["Find Chord Charts & Lyrics", "Buscar Tablas de Acordes y Letras de Canción"],
            ["Find The Right Key For Your Song", "Encuentra La Clave Adecuada Para Tu Canción"],
            ["Download and Print Songs", "Descargar e Imprimir Canciones"],
            ["Find Available Translations In English/Spanish", "Buscar Traducciones Disponibles En Inglés/Español"],
            ["Transpose Chord Charts", "Transponer Tablas de Acordes"],
            ["Upload & Edit Your Own Songs", "Subir y Editar Tus Propias Canciones"],
            // Resources
            ["Resources", "Recursos"],
            ["Christian Music Stations", "Estaciones De Música Cristiana"],
            ["What Song is That?", "¿Que Canción Es Esa?"],
            // Prompts
            ["Choose an option to upload a new song", "Elige una opción para subir una nueva canción"],
            // Footer
            ["Contact -", "Contacto -"],
        ]
    },
    {
        pages: ["databaseSongs.html", "songs.html"],
        tranlations: [
            // Refine Search
            ["Refine Search", "Refinar Busqueda"],
            ["Any", "Cualquier"],
            ["Styles", "Estilos"],
            ["Contains...", "Contiene..."],
            ["Reset Options", "Desmarcar Opciones"],
            // Songs / Search Results
            ["All Songs", "Todas Las Canciones"],
            ["Relevance", "Relevancia"],
            ["Alphabetical", "Alfabética"],
            ["Type", "Tipo"],
            ["Artists", "Artistas"],
            ["View Song", "Ver Canción"],
            ["Playlists", "Playlists"],
            ["No results found", "No Resultados"],
            ["results", "resultados"],
            ["Style", "Estilo"],
            ["Back to top", "Volver arriba"],
            ["Could not connect to the database. Try again later...", "No se pudo conectar a la base de datos. Inténtalo de nuevo más tarde..."],
            // Prompts
            ["Start searches with \"*\" to find translations", "Empieza busqueda con \"*\" para traducciones"],
            ["Or find translations in here", "O encuentra traducciones aquí"],
            ["Search for a song name or artist", "Buscar por nombre de canción o artista"],
            ["Click here to refine search results", "Refinar los resultados de búsqueda"],
            // Playlist Titles
            ["Open Playlist", "Abre el Playlist"],
        ]
    },
    {
        pages: ["databaseView.html"],
        tranlations: [
            // Problem Loading Song Popup
            ["Problem Loading the Song...", "Problema al Cargar la Canción..."],
            ["Search For Songs", "Buscar Canciónes"],
            ["Upload A Song", "Subir Una Canción"],
            ["Use Copied Text", "Usa Texto Copiado"],
            // View / Edit
            ["Chords", "Acordes"],
            ["Transpose Options", "Opciones de Transposición"],
            ["No Chords", "No Acordes"],
            ["Hear Key", "Escuchar Clave"],
            ["Download Song", "Descargar Canción"],
            ["Print", "Imprimir"],
            ["Key:", "Clave:"],
            ["Undo All", "Deshacer Todo"],
            ["Song Font", "Fuente - Canción"],
            ["Edit Song", "Editar Canción"],
            ["View Song", "Ver Canción"],
            ["*Key Changes:", "*Cambios de Clave"],
            ["Chord Color:", "Color de Acordes:"],
            ["Update The Cabinet", "Actualizar El Gabinete"],
            ["By", "Por"],
            ["Find Versions", "Busca Versiones"],
            ["Song Details", "Detalles"],
            ["Share Song", "Comparte la Canción"],
            // Prompts
            ["Click to change the key", "Haga click para cambiar la clave"],
            ["Click to hear the current key", "Escuchar la clave actual"],
            ["Click to download the song", "Descargar la canción"],
            // Playlists
            ["Remove Song", "Eliminar Canción"],
        ]
    },
    {
        pages: ["databaseSongs.html", "songs.html", "databaseView.html"],
        tranlations: [
            ["Lyrics", "Letra"],
            ["YouTube", "YouTube"],
            // Song info
            ["Song Info", "Info de Canción"],
            ["Song", "Canción"],
            ["Artist", "Artista"],
            ["Tags", "Estilos"],
            ["Language", "Idioma"],
            ["Song ID", "Canción ID"],
            ["Praise", "Alabanza"],
            ["Worship", "Adoración"],
            ["Christmas", "Navidad"],
            ["Latin", "Latino"],
            ["Easter", "Pasqua"],
            ["English", "Inglés"],
            ["Spanish", "Español"],
            ["Find Translations", "Busca Traducciones"],
            // Playlist Titles
            ["Open in YouTube", "Abre en YouTube"],
            ["Share Playlist", "Comparte el Playlist"],
            ["Options", "Opciones"],
            ["Share", "Compartir"],
        ]
    }
];

// ******************************************************
var translations = [];

const LANGUAGE = {
    ENGLISH: 0,
    SPANISH: 1
}
Object.freeze(LANGUAGE);

var currentLanguage = LANGUAGE.ENGLISH;

// Translate page on load
document.addEventListener("DOMContentLoaded", function () {
    translations = getPageTranslations();

    // Language
    let savedLanguage = localStorage.getItem("language");
    if (!savedLanguage) {
        localStorage.setItem("language", "English");
    } else if (savedLanguage === "Español") {
        translatePage("Español");
    }
});

// Returns an array of translations for the current page
function getPageTranslations() {
    let htmlDocName = window.location.pathname.split("/").pop();

    // No path name found - probably on the home page
    if (!htmlDocName) {
        htmlDocName = "databaseHome.html";
    }

    let pageTranslations = [];

    // Get page translations from data
    translationsData.forEach(pagesTranslationsData => {
        if (pagesTranslationsData.pages.includes("All") || pagesTranslationsData.pages.includes(htmlDocName)) {
            pageTranslations = pageTranslations.concat(pagesTranslationsData.tranlations);
        }
    });

    return pageTranslations;
}

// ******************************************************

// Translates text if available - otherwise returns the input
function translate(text, fromLanguage, toLanguage) {
    text = text.replace("&amp;", "&");

    for (let i = 0; i < translations.length; i++) {
        if (translations[i][fromLanguage] === text) {
            if (checkingTranslations) {
                updateTranslationsCheck(text); // Remove from list of unused translations
            }

            return translations[i][toLanguage];
        }
    }

    // Couldn't translate
    if (checkingTranslations) {
        logPossibleMissingTranslation(text);
    }

    return text;
}

// Translates titles for a group of result elements
function translateResultNode(element, fromLanguage, toLanguage) {
    // Try translate result title
    if (!!element.title) {
        let parts = element.title.split(":");

        if (parts.length === 2) {
            element.title = translate(parts[0], fromLanguage, toLanguage) + ":" + parts[1];
        } else {
            element.title = translate(parts[0], fromLanguage, toLanguage);
        }
    }

    // Leaf/Small node
    if (!element.innerHTML || element.innerHTML.length === 1) {
        return;
    }

    // Try translate innerHTML text
    if (element.hasChildNodes()) {
        // Translate children
        for (let i = 0; i < element.childNodes.length; i++) {
            translateResultNode(element.childNodes[i], fromLanguage, toLanguage);
        }
    }
}

// Translates text, titles, and palceholders for an element and its children
function translateNode(element, fromLanguage, toLanguage) {
    if (!!element.classList) {
        // Don't translate
        if (element.classList.contains("noTranslation")) {
            return;
        }

        // Translate results
        if (element.classList.contains("translateTitles")) {
            translateResultNode(element, fromLanguage, toLanguage);
            return;
        }
    }

    // Try translate title
    if (!!element.title) {
        element.title = translate(element.title, fromLanguage, toLanguage);
    }

    // Try translate placeholder
    if (!!element.placeholder) {
        element.placeholder = translate(element.placeholder, fromLanguage, toLanguage);
    }

    // Text Button
    if (!!element.type && element.type === "button") {
        element.value = translate(element.value, fromLanguage, toLanguage);
        return;
    }

    // Leaf/Small node
    if (!element.innerHTML || element.innerHTML.length === 1) {
        return;
    }

    // Try translate innerHTML text
    let firstChar = element.innerHTML[0];
    if (firstChar !== ' ' && firstChar !== '<' && firstChar !== '\n') {
        element.innerHTML = translate(element.innerHTML, fromLanguage, toLanguage);
    } else if (element.hasChildNodes()) {
        // Translate children
        for (let i = 0; i < element.childNodes.length; i++) {
            translateNode(element.childNodes[i], fromLanguage, toLanguage);
        }
    }
}

// Translates an English node if not in the correct language
function translateNodeToCurrentLanguage(element) {
    if (currentLanguage !== LANGUAGE.ENGLISH) {
        translateNode(element, LANGUAGE.ENGLISH, currentLanguage);
    }
}

// Checks whether the current language is Spanish
function usingSpanish() {
    return currentLanguage === LANGUAGE.SPANISH;
}

// Return the language id of a string
function getLanguageID(language) {
    switch (language) {
        case "English": return LANGUAGE.ENGLISH;
        case "Español": return LANGUAGE.SPANISH;
        default:
            console.log("Invalid Language!!");
            return -1;
    }
}

// Translates the page to the selected language
function translatePage(language) {
    let languageID = getLanguageID(language);
    if (languageID === -1 || currentLanguage === languageID) {
        return;
    }

    // Set language dropdown and store language is LS
    currentLanguage = languageID;
    localStorage.setItem("language", language);
    get("languageValue").innerHTML = language;

    // Translate page
    switch (languageID) {
        case LANGUAGE.SPANISH:
            // To Spanish
            language = "Spanish";
            document.documentElement.lang = "es";
            translateNode(document.body, LANGUAGE.ENGLISH, LANGUAGE.SPANISH);
            break;
        case LANGUAGE.ENGLISH:
            // To English
            language = "English";
            document.documentElement.lang = "en";
            translateNode(document.body, LANGUAGE.SPANISH, LANGUAGE.ENGLISH);
            break;
    }
}

// ******************************************************

// Check for unused translations and untranslated text
var firstCheck = true;
var tranlationsCheck = [];
var checkingTranslations = false;
var missingTranslations = false;

// Translates the page and logs missing translations, and unused translations
function checkTanslations() {
    // Setup checks and translate page
    if (firstCheck) {
        tranlationsCheck = translations.map(translations => translations[0]);
        firstCheck = false;
    }
    missingTranslations = false;
    checkingTranslations = false;
    translatePage("English");
    checkingTranslations = true;
    translatePage("Español");

    // Log the results of checks
    if (!missingTranslations) {
        console.log(":) No missing translations");
    }

    if (tranlationsCheck.length > 0) {
        let message = "Unused translations:\r\n\r\n";
        tranlationsCheck.forEach(translation => {
            message += "'" + translation + "'\r\n";
        })
        console.log(message);
    } else {
        console.log(":) No excess translations");
    }


    console.log("------------------");
}

// Mark a translation as used
function updateTranslationsCheck(text) {
    let index = tranlationsCheck.indexOf(text);
    if (index !== -1) {
        tranlationsCheck.splice(index, 1);
    }
}

// Log a translation as missing if it contains letters
function logPossibleMissingTranslation(text) {
    if (/[a-zA-Z]/g.test(text)) {
        missingTranslations = true;
        console.log("Missing translation: '" + text + "'");
    }
}
