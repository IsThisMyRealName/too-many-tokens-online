// tmtopptmtopptmtopp_dnd_Commoner/Scout_.*Male.*
const tooManyTokensOnlinePathPrefix = "tmtopptmtopptmtopp";
const seperator1 = "_";
const seperator2 = "/";

export async function getTokenLinksFromPath(token, potentialWildcardPath) {
  if (!potentialWildcardPath.startsWith(tooManyTokensOnlinePathPrefix)) {
    return;
  }
  const wildcardPath = potentialWildcardPath.replace(
    tooManyTokensOnlinePathPrefix,
    ""
  );
  let wildcardPathParts = wildcardPath.split(seperator1).filter((part) => part);
  const system = getSystemFromWildcardPath(wildcardPath);
  let creatures = wildcardPathParts[1]
    .split(seperator2)
    .filter((creature) => creature);
  const regex = new RegExp(wildcardPathParts[2]);

  // Use await to wait for the promise to resolve
  let links = await getLinksForCreatures(system, creatures, regex);
  applyRandomTokenImages(
    token,
    system,
    links.filter((link) => regex.test(link))
  );
}

export function getSystemFromWildcardPath(wildcardPath) {
  let wildcardPathParts = wildcardPath.split(seperator1).filter((part) => part);
  return wildcardPathParts[0];
}

export async function getLinksForCreatures(system, creatureNames) {
  let filePath = `modules/too-many-tokens-online/${system}/names.txt`;
  let foundCreatureNames = [];

  try {
    let response = await fetch(filePath);
    let text = await response.text();
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
      return [];
    }

    let fetchPromises = foundCreatureNames.map(async (creatureName) => {
      let wildcardFilePath = `modules/too-many-tokens-online/${system}/links/${creatureName}.txt`;
      let response = await fetch(wildcardFilePath);
      let text = await response.text();
      return removeLinesEndingWithTxt(text).map(
        (str) => `${creatureName}/${str}`
      );
    });

    return Promise.all(fetchPromises).then((results) => {
      return results.flat();
    });
  } catch (error) {
    ui.notifications.error(
      `Error fetching names from ${filePath}: ${error.message}`
    );
    return [];
  }
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

export async function applyRandomTokenImages(tokenDocument, system, links) {
  const imageChoice = Math.floor(Math.random() * links.length);
  const image = links[imageChoice];
  console.log(
    `https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-${system}/main/${image}`
  );
  try {
    await tokenDocument.update({
      "texture.src": `https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-${system}/main/${image}`,
    });
    ui.notifications.info(`Token image updated: ${image}`);
  } catch (error) {
    ui.notifications.error(`Error updating token image: ${error.message}`);
  }
}

export async function applyTmtoWildcardPathToActor(actor, wildcardPath) {
  const tokenDocument = await actor.getTokenDocument();
  const actorId = tokenDocument.actorId;
  let baseActor = game.actors.get(actorId);

  const oldImgPath = baseActor.prototypeToken.texture.src;
  const wasRandomImgBefore = baseActor.prototypeToken.randomImg;
  let tokenImgArray = null;
  await baseActor
    .update({
      "prototypeToken.texture.src": wildcardPath,
      "prototypeToken.randomImg": true,
    })
    .then((tokenImgArray = await baseActor.getTokenImages()));
  tokenImgArray = await baseActor.getTokenImages();
  if (tokenImgArray != null && tokenImgArray.length > 0) {
    ui.notifications.info(
      `Found ${tokenImgArray.length} images for "${wildcardPath}"`
    );
  } else {
    ui.notifications.warn(`No images found for "${wildcardPath}".`);
    await baseActor.update({
      "prototypeToken.texture.src": oldImgPath,
      "prototypeToken.randomImg": wasRandomImgBefore,
    });
  }
}
