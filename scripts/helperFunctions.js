// tmtopptmtopptmtopp_dnd_Commoner/Scout_.*Male.*
const tooManyTokensOnlinePathPrefix = "tmtopptmtopptmtopp";
const seperator1 = "_";
const seperator2 = "/";

export async function getTokenLinksFromPath(potentialWildcardPath) {
  if (!potentialWildcardPath.startsWith(tooManyTokensOnlinePathPrefix)) {
    return;
  }
  const wildcardPath = potentialWildcardPath.replace(
    tooManyTokensOnlinePathPrefix,
    ""
  );
  let wildcardPathParts = wildcardPath.split(seperator1).filter((part) => part);
  const system = wildcardPathParts[0];
  let creatures = wildcardPathParts[1]
    .split(seperator2)
    .filter((creature) => creature);
  const regex = wildcardPathParts[2];

  (async () => {
    let links = await getLinksForCreatures(system, creatures, regex).then();
    console.log(links);
  })();
}

export async function getLinksForCreatures(system, creatureNames, regex) {
  let filePath = `modules/too-many-tokens-online/${system}/names.txt`;
  let foundCreatureNames = [];
  let foundLinks = [];
  // Fetch the names from the file
  fetch(filePath)
    .then((response) => response.text())
    .then((text) => {
      let names = text.split("\n").filter((line) => line.trim() !== "");
      creatureNames.forEach((creatureName) => {
        if (names.includes(creatureName)) {
          foundCreatureNames.push(creatureName);
        } else {
          ui.notifications.info(
            `Could find no links for creature name: ${creatureName}`
          );
        }
      });
      if (foundCreatureNames.length <= 0) {
        ui.notifications.error(`No creature names found for ${creatureNames}`);
        return;
      }
      var namesProcessed = 0;
      foundCreatureNames.forEach(async (creatureName) => {
        let wildcardFilePath = `modules/too-many-tokens-online/${system}/links/${creatureName}.txt`;
        fetch(wildcardFilePath)
          .then((response) => response.text())
          .then(async (text) => {
            // Split the text into lines
            let lines = removeLinesEndingWithTxt(text);
            foundLinks = foundLinks.concat(lines);
            namesProcessed++;
            if (namesProcessed === foundCreatureNames.length) {
              return await foundLinks;
            }
          });
      });
    })
    .catch((error) => {
      ui.notifications.error(
        `Error fetching names from ${filePath}: ${error.message}`
      );
    });
}

export function replaceCapitalizationAndRemoveSpaces(
  creatureName,
  isRestoring
) {
  const halfOrcString = "HalfOrc";
  const halfElfString = "HalfElf";
  const nsfwString = "NSFW";
  const halfOrcReplacementString = "Halforc";
  const halfElfReplacementString = "Halfelf";
  const nsfwReplacementString = "Nsfw";
  if (isRestoring) {
    return creatureName
      .replace(halfElfReplacementString, halfElfString)
      .replace(halfOrcReplacementString, halfOrcString)
      .replace(nsfwReplacementString, nsfwString)
      .replace(/([A-Z])/g, " $1")
      .trim();
  } else {
    return creatureName
      .replace(" ", "")
      .replace(halfOrcString, halfOrcReplacementString)
      .replace(halfElfString, halfElfReplacementString)
      .replace(nsfwString, nsfwReplacementString);
  }
}

function removeLinesEndingWithTxt(text) {
  // Split the text into an array of lines
  const lines = text.split(/\r?\n/);

  // Filter out the lines that don't end with .txt
  const filteredLines = lines.filter((line) => !line.trim().endsWith(".txt"));

  return filteredLines;
}
