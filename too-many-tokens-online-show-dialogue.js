const system = "dnd";
const tooManyTokensOnlinePathPrefix = "tmtopptmtopptmtopp";
const seperator1 = "_";
const seperator2 = "/";
let dropdownOptions = [];
const filePath = `modules/too-many-tokens-online/${system}/names.txt`;

fetch(filePath)
  .then((response) => response.text())
  .then((text) => {
    dropdownOptions = text.split("\n").filter((line) => line.trim() !== "");
    renderDialog(dropdownOptions);
  })
  .catch((error) => {
    ui.notifications.error(
      `Error fetching names from ${filePath}: ${error.message}`
    );
  });

function renderDialog(options) {
  new Dialog({
    title: "Select creature",
    content: `
    <form>
      <div class="form-group">
        <label for="actorSelect">Select an actor:</label>
        <input list="actorSelectList" id="actorSelect" name="actorSelect">
          <datalist id="actorSelectList" style="max-height: 200px; overflow-y: auto!important">
            ${options
              .map((option) => `<option value="${option}">${option}</option>`)
              .join("")}
          </datalist>
          </div>
          </form>
          <p style="font-style: italic; margin-top: 5px;">See all available tokens at <a href="https://toomanytokens.com/" target="_blank">toomanytokens.com</a>.</p>
    `,
    buttons: {
      select: {
        label: "Select Wildcards",
        callback: (html) => {
          const selectedActor = html.find("#actorSelect")[0].value.trim();
          if (!selectedActor) {
            ui.notifications.warn("Please select a creature!");
            return;
          }
          const wildcardFilePath = `modules/too-many-tokens-online/${system}/links/${selectedActor}.txt`;

          fetch(wildcardFilePath)
            .then((response) => response.text())
            .then((text) => {
              text = removeLinesEndingWithTxt(text);
              const lines = text.split("\n");
              const fileList = lines.map((item) =>
                item.replace(new RegExp(/\(.*$/, "g"), "")
              );

              const nameLists = new Map();
              const actorNameWithoutSpaces = selectedActor
                .replace(/\b\w/g, (match) => match.toUpperCase())
                .replace(/\s/g, "");
              const fullNamesList = fileList.map((file) =>
                file
                  .split("/")
                  .pop()
                  .split("%20")[0]
                  .split(" ")[0]
                  .replace(actorNameWithoutSpaces, "")
              );

              fullNamesList.forEach((file) => {
                const fileNameParts = [actorNameWithoutSpaces];
                fileNameParts.push(
                  ...replaceCapitalizationAndRemoveSpaces(file, false)
                    .split(/(?=[A-Z])/)
                    .filter(Boolean)
                    .map((part) => part)
                );

                fileNameParts.forEach((part, index) => {
                  if (!nameLists.has(index)) {
                    nameLists.set(index, new Set());
                  }
                  nameLists.get(index).add(part);
                });
              });

              const dialogContent = document.createElement("div");

              nameLists.forEach((list, index) => {
                const row = document.createElement("div");
                row.style.display = "inline-block";
                row.style.marginRight = "20px";
                row.className = "CheckboxSubContainer";
                if (list.size > 1) {
                  const anyCheckbox = document.createElement("input");
                  anyCheckbox.type = "checkbox";
                  anyCheckbox.name = `any-checkbox-${selectedActor}-${index}`;
                  anyCheckbox.id = `any-checkbox-${selectedActor}-${index}`;
                  anyCheckbox.checked = false;
                  anyCheckbox.value = "Any";
                  const anyLabel = document.createElement("label");
                  anyLabel.htmlFor = anyCheckbox.id;
                  anyLabel.appendChild(document.createTextNode("any"));

                  const anyContainer = document.createElement("div");
                  anyContainer.appendChild(anyCheckbox);
                  anyContainer.appendChild(anyLabel);
                  row.appendChild(anyContainer);
                }

                list.forEach((item) => {
                  item = replaceCapitalizationAndRemoveSpaces(item, true);
                  const checkbox = document.createElement("input");
                  checkbox.type = "checkbox";
                  checkbox.name = `checkbox-${selectedActor}-${index}`;
                  checkbox.value = item.replace(/\s/g, "");
                  checkbox.id = `checkbox-${selectedActor}-${index}-${item}`;

                  const label = document.createElement("label");
                  label.htmlFor = checkbox.id;
                  label.appendChild(document.createTextNode(item));

                  const itemContainer = document.createElement("div");
                  itemContainer.appendChild(checkbox);
                  itemContainer.appendChild(label);
                  row.appendChild(itemContainer);
                });

                dialogContent.appendChild(row);
              });

              const buttons = {
                assignTokens: {
                  label: `Assign Too-Many-Tokens to selected tokens`,
                  callback: async () => {
                    const regex = new RegExp(generateRegex());
                    const selectedPaths = lines.filter((link) =>
                      regex.test(link)
                    );
                    if (selectedPaths.length <= 0) {
                      ui.notifications.warn(
                        `Could not find links with regex ${regex}. Please select other attributes.`
                      );
                    } else {
                      applyRandomTokenImages(selectedActor, selectedPaths);
                    }
                  },
                },
                assignPrototypeTokens: {
                  label: "Assign Too-Many-Tokens to prototype token",
                  callback: async () => {
                    const selectedTokens = canvas.tokens.controlled;
                    if (selectedTokens.length !== 1) {
                      ui.notifications.warn("Please select only one token.");
                      return;
                    }

                    const regex = generateRegex();
                    const baseActor = game.actors.get(
                      selectedTokens[0].document.actorId
                    );
                    if (!baseActor) {
                      ui.notifications.warn(
                        "Actor not found for the selected token."
                      );
                      return;
                    }
                    applyTmtoWildcardPathToActor(
                      baseActor,
                      createTmtoWildcardImagePath(system, selectedActor, regex),
                      false
                    );
                  },
                },
                assignPrototypeTokensAndUpdateActor: {
                  label:
                    "Assign Too-Many-Tokens to prototype token and update actor image",
                  callback: async () => {
                    const selectedTokens = canvas.tokens.controlled;
                    if (selectedTokens.length !== 1) {
                      ui.notifications.warn("Please select only one token.");
                      return;
                    }

                    const regex = generateRegex();
                    const baseActor = game.actors.get(
                      selectedTokens[0].document.actorId
                    );
                    if (!baseActor) {
                      ui.notifications.warn(
                        "Actor not found for the selected token."
                      );
                      return;
                    }
                    applyTmtoWildcardPathToActor(
                      baseActor,
                      createTmtoWildcardImagePath(system, selectedActor, regex),
                      true
                    );
                  },
                },
                cancel: {
                  label: "Cancel",
                },
              };

              renderWildcardDialog(
                selectedActor,
                dialogContent.outerHTML,
                buttons
              );
            })
            .catch((error) => {
              ui.notifications.error(
                `Error fetching wildcards from ${wildcardFilePath}: ${error.message}`
              );
            });
        },
      },
      cancel: {
        label: "Cancel",
      },
    },
  }).render(true);
}

function renderWildcardDialog(actorName, content, buttons) {
  const dialog = new Dialog({
    title: `Wildcards for ${actorName}`,
    content: content,
    buttons,
  });
  dialog.position.width = "auto";
  dialog.render(true);
}

function replaceAfterFirstDragonborn(inputString) {
  const index = inputString.indexOf("Dragonborn");
  return index !== -1
    ? inputString.substring(0, index + "Dragonborn".length)
    : inputString;
}

function removeLinesEndingWithTxt(text) {
  const lines = text.split("\n");
  const filteredLines = lines.filter((line) => !line.trim().endsWith(".txt"));
  return filteredLines.join("\n");
}

function createTmtoWildcardImagePath(system, creatureName, regex) {
  return [tooManyTokensOnlinePathPrefix, system, creatureName, regex].join(
    seperator1
  );
}

async function applyTmtoWildcardPathToActor(
  actor,
  wildcardPath,
  updateActorImage
) {
  try {
    const regex = new RegExp(
      wildcardPath.split(seperator1).filter((part) => part)[3]
    );
    const tokenImgArrayUnfiltered = await getLinksForCreatures(
      getSystemFromWildcardPath(wildcardPath),
      getCreatureNamesFromWildcardPath(wildcardPath)
    );
    const tokenImgArray = tokenImgArrayUnfiltered.filter((tokenImg) =>
      regex.test(tokenImg)
    );

    if (tokenImgArray && tokenImgArray.length > 0) {
      ui.notifications.info(
        `Found ${tokenImgArray.length} images for "${wildcardPath}"`
      );
      if (updateActorImage) {
        await actor.update({
          "prototypeToken.texture.src": wildcardPath + ".webp",
          "prototypeToken.randomImg": true,
          img: `https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-${getSystemFromWildcardPath(
            wildcardPath
          )}/main/${tokenImgArray[0]}`,
        });
      } else {
        await actor.update({
          "prototypeToken.texture.src": wildcardPath + ".webp",
          "prototypeToken.randomImg": true,
        });
      }
    } else {
      ui.notifications.warn(`No images found for "${wildcardPath}".`);
    }
  } catch (error) {
    ui.notifications.error(`Error applying wildcard path: ${error.message}`);
  }
}

async function applyRandomTokenImages(selectedActor, links) {
  const selectedTokens = canvas.tokens.controlled;
  if (!selectedTokens.length) {
    ui.notifications.warn("No tokens selected.");
    return;
  }
  if (!links.length) {
    ui.notifications.warn("No links provided.");
    return;
  }
  selectedTokens.forEach(async (token) => {
    const imageChoice = Math.floor(Math.random() * links.length);
    const image = links[imageChoice];
    try {
      await token.document.update({
        "texture.src": `https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-${system}/main/${selectedActor}/${image}`,
      });
      // ui.notifications.info(`Token image updated: ${image}`);
    } catch (error) {
      ui.notifications.error(`Error updating token image: ${error.message}`);
    }
  });
}

function generateRegex() {
  let regex = ".*";
  const checkboxContainers = document.querySelectorAll(".CheckboxSubContainer");
  checkboxContainers.forEach((container, index) => {
    const checkedCheckboxes = container.querySelectorAll(
      "input[type='checkbox']:checked"
    );
    if (checkedCheckboxes.length > 0) {
      regex += "(";
      checkedCheckboxes.forEach((checkbox, i) => {
        if (i > 0) {
          regex += "|"; // OR operator
        }
        if (checkbox.value === "Any") {
          regex += ".*"; // Match any text
        } else {
          regex += checkbox.value;
        }
      });
      regex += ")";
    }
    if (index < checkboxContainers.length - 1) {
      regex += ".*"; // Match any text between CheckboxSubContainers
    }
  });
  regex += ".*"; // End of string anchor
  return regex;
}

async function getLinksForCreatures(system, creatureNames) {
  const filePath = `modules/too-many-tokens-online/${system}/names.txt`;
  let foundCreatureNames = [];

  try {
    const response = await fetch(filePath);
    const text = await response.text();
    const names = text.split("\n").filter((line) => line.trim() !== "");

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

    const fetchPromises = foundCreatureNames.map(async (creatureName) => {
      const wildcardFilePath = `modules/too-many-tokens-online/${system}/links/${creatureName}.txt`;
      const response = await fetch(wildcardFilePath);
      let text = await response.text();
      text = removeLinesEndingWithTxt(text);
      const lines = text.split("\n");
      return lines.map((str) => `${creatureName}/${str}`);
    });

    const results = await Promise.all(fetchPromises);
    return results.flat();
  } catch (error) {
    ui.notifications.error(
      `Error fetching names from ${filePath}: ${error.message}`
    );
    return [];
  }
}

function getSystemFromWildcardPath(wildcardPath) {
  const wildcardPathParts = removePathPrefix(wildcardPath)
    .split(seperator1)
    .filter((part) => part);
  return wildcardPathParts[0];
}

function getCreatureNamesFromWildcardPath(wildcardPath) {
  const wildcardPathParts = removePathPrefix(wildcardPath)
    .split(seperator1)
    .filter((part) => part);
  return wildcardPathParts[1].split(seperator2).filter((creature) => creature);
}

function removePathPrefix(imagePath) {
  return imagePath.replace(tooManyTokensOnlinePathPrefix, "");
}

function replaceCapitalizationAndRemoveSpaces(creatureName, isRestoring) {
  if (!creatureName) return "";
  const halfOrcString = "HalfOrc";
  const halfElfString = "HalfElf";
  const nsfwString = "NSFW";
  const halfOrcReplacementString = "Halforc";
  const halfElfReplacementString = "Halfelf";
  const nsfwReplacementString = "Nsfw";
  creatureName = replaceAfterFirstDragonborn(creatureName);
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
      .replace(halfElfString, halfElfReplacementString)
      .replace(halfOrcString, halfOrcReplacementString)
      .replace(nsfwString, nsfwReplacementString);
  }
}
