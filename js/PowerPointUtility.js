
//Reads a PPTX file object or blob and returns an array of strings containing the text from each slide.
async function extractTextFromPPTX(pptxFile) {
    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(pptxFile);

        // 1. Trace master presentation mapping to determine correct slide chronological order
        const presentationXml = await loadedZip.file("ppt/presentation.xml").async("text");
        const sldIdLstRegex = /<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/;
        if (!sldIdLstRegex.test(presentationXml)) return [];

        const rawListContent = presentationXml.match(sldIdLstRegex)[0];
        const relIdMatches = rawListContent.match(/r:id="([^"]+)"/g) || [];

        const presentationRelsXml = await loadedZip.file("ppt/_rels/presentation.xml.rels").async("text");
        const orderedSlideFiles = relIdMatches.map(relIdTag => {
            const relId = relIdTag.match(/"([^"]+)"/)[1];
            const relRegex = new RegExp(`<Relationship[^>]*Id="${relId}"[^>]*Target="([^"]+)"`);
            const match = presentationRelsXml.match(relRegex);
            return match ? `ppt/${match[1]}` : null;
        }).filter(path => path !== null);

        const slideTextArray = [];

        // 2. Loop through each slide path to precisely parse text formatting
        for (const filePath of orderedSlideFiles) {
            const slideFileInstance = loadedZip.file(filePath);
            if (!slideFileInstance) {
                slideTextArray.push("");
                continue;
            }

            const slideXmlText = await slideFileInstance.async("text");

            // This parser loops through individual paragraph container element chunks (<a:p>...</a:p>)
            const paragraphRegex = /<a:p>([\s\S]*?)<\/a:p>/g;
            let paragraphMatch;
            let slideParagraphs = [];

            while ((paragraphMatch = paragraphRegex.exec(slideXmlText)) !== null) {
                const paragraphXml = paragraphMatch[1];

                // Track characters inside the current paragraph container block
                let currentParagraphText = "";

                // Find text pieces (<a:t>text</a:t>) and break elements (<a:br/>) in chronological order
                const elementRegex = /<a:t>([\s\S]*?)<\/a:t>|<a:br\/>/g;
                let elementMatch;

                while ((elementMatch = elementRegex.exec(paragraphXml)) !== null) {
                    if (elementMatch[0] === '<a:br/>') {
                        // If it matches a break element tag, append a native JavaScript newline character
                        currentParagraphText += "\n";
                    } else if (elementMatch[1]) {
                        // If it matches a standard text container tag, append the literal text value string
                        currentParagraphText += elementMatch[1];
                    }
                }

                // If the paragraph node contains text, save it into our working array index loop
                if (currentParagraphText.trim() !== "") {
                    slideParagraphs.push(currentParagraphText);
                }
            }

            // Combine separate text paragraph clusters with a newline spacing wrapper
            slideTextArray.push(slideParagraphs.join("\n").trim());
        }

        return slideTextArray;

    } catch (error) {
        console.error("Failed to parse and extract structured text data from PPTX archive layout:", error);
        throw error;
    }
}

// Takes an array of strings and turns them into slides
// Any slide with the "[TITLE]" prefix gets 60pt font size instead of 40pt
async function generateAndDownloadPowerPoint(textArray, fileName) {
    try {
        const targetSlideCount = textArray.length;

        // 1. Fetch your verified template PPTX
        let templateFile = "template_100_slides.pptx";
        if (targetSlideCount <= 20) templateFile = "template_20_slides.pptx";
        else if (targetSlideCount <= 50) templateFile = "template_50_slides.pptx";
        const templateResponse = await fetch("templates/" + templateFile);
        if (!templateResponse.ok) throw new Error("Failed to load 50-slide presentation template.");
        const templateBlob = await templateResponse.blob();

        // 2. Open the file as a zip archive using JSZip
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(templateBlob);

        // 3. STEP ONE: Update the text nodes and check for Title Slides
        for (let i = 1; i <= targetSlideCount; i++) {
            const slideFilePath = `ppt/slides/slide${i}.xml`;
            let slideXmlText = await loadedZip.file(slideFilePath).async("text");

            let rawTextValue = textArray[i - 1]; // Array index is 0-based
            let isTitleSlide = false;

            // Check if the current string starts with the [TITLE] indicator prefix
            if (rawTextValue.startsWith("[TITLE]")) {
                isTitleSlide = true;
                // Remove the prefix from the final text string that displays on the slide
                rawTextValue = rawTextValue.replace("[TITLE]", "").trim();
            }

            // A. Update the text string content
            const placeholderText = "PLACEHOLDER";
            if (slideXmlText.includes(placeholderText)) {
                const regex = new RegExp(placeholderText, 'g');
                slideXmlText = slideXmlText.replace(regex, rawTextValue);
            } else {
                slideXmlText = slideXmlText.replace(/<a:t>[^<]*<\/a:t>/, `<a:t>${rawTextValue}</a:t>`);
            }

            // B. If it's a Title Slide, bump the font size from 32pt (3200) to 40pt (4000)
            if (isTitleSlide) {
                // PowerPoint tracks text size in hundredths of a point (sz="3200" is 32pt)
                if (slideXmlText.includes('sz="3200"')) {
                    slideXmlText = slideXmlText.replace(/sz="3200"/g, 'sz="4000"');
                } else {
                    // FALLBACK: If the template uses variations like single quotes or lacks explicit size,
                    // this targets any existing size tag inside the text run properties block
                    slideXmlText = slideXmlText.replace(/sz="\d+"/g, 'sz="4000"');
                }
            }

            // Save the modified slide file back into the archive layout
            loadedZip.file(slideFilePath, slideXmlText);
        }

        // 4. STEP TWO: Hide all the remaining unneeded slides from PowerPoint's display engine
        let presentationXml = await loadedZip.file("ppt/presentation.xml").async("text");
        const sldIdLstRegex = /<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/;

        if (sldIdLstRegex.test(presentationXml)) {
            const rawListContent = presentationXml.match(sldIdLstRegex);
            const innerXmlString = rawListContent[0];
            let slideTags = innerXmlString.match(/<p:sldId[^>]*\/>/g) || [];

            if (slideTags.length > targetSlideCount) {
                slideTags = slideTags.slice(0, targetSlideCount);
                const optimizedSlideList = `<p:sldIdLst>\n${slideTags.join('\n')}\n</p:sldIdLst>`;
                presentationXml = presentationXml.replace(sldIdLstRegex, optimizedSlideList);
            }
        }
        loadedZip.file("ppt/presentation.xml", presentationXml);

        // 5. Compile the modified zip archive back into a finalized presentation download blob
        const finalizedBlob = await loadedZip.generateAsync({ type: 'blob' });

        // 6. Fire browser download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(finalizedBlob);
        downloadLink.download = sanitizeFilename(fileName) + ".pptx";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        console.error("Dynamic Generation with Styling Error:", error);
    }
}

function sanitizeFilename(input) {
    if (typeof input !== "string") return "slides";

    // 1. Remove control characters (0-31 and 127) and illegal OS characters: < > : " / \ | ? *
    const illegalChars = /[\x00-\x1F\x7F<>:"/\\|?*]/g;
    let sanitized = input.replace(illegalChars, "");

    // 2. Remove Windows reserved filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
    if (reservedNames.test(sanitized)) {
        sanitized = "_" + sanitized;
    }

    // 3. Remove trailing periods or spaces which cause issues on Windows
    sanitized = sanitized.replace(/[. ]+$/, "");

    // 5. Fallback for empty strings
    return sanitized || "slides";
}