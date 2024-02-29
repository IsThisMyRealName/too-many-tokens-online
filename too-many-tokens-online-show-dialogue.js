const system = "dnd";
let dropdownOptions = [];
let filePath = `modules/too-many-tokens-online/${system}/names.txt`;

// Fetch the names from the file
fetch(filePath)
  .then((response) => response.text())
  .then((text) => {
    dropdownOptions = text.split("\n").filter((line) => line.trim() !== "");
    // Create and render the dialog with dropdown options
    renderDialog(dropdownOptions);
  })
  .catch((error) => {
    ui.notifications.error(
      `Error fetching names from ${filePath}: ${error.message}`
    );
  });

function renderDialog(options) {
  new Dialog({
    title: "Select Actor",
    content: `
      <div>
        <label for="actorSelect">Select an actor:</label>
        <select id="actorSelect">
          ${options
            .map((option) => `<option value="${option}">${option}</option>`)
            .join("")}
        </select>
      </div>
    `,
    buttons: {
      select: {
        label: "Select Wildcards",
        callback: (html) => {
          let selectedActor = html.find("#actorSelect")[0].value.trim();
          let wildcardFilePath = `modules/too-many-tokens-online/${system}/links/${selectedActor}.txt`;

          fetch(wildcardFilePath)
            .then((response) => response.text())
            .then((text) => {
              text = removeLinesEndingWithTxt(text);
              // Split the text into lines
              let lines = text.split("\n");
              //Keep HalfOrc and HalfElf:
              const halfOrcString = "HalfOrc";
              const halfElfString = "HalfElf";
              const halfOrcReplacementString = "Halforc";
              const halfElfReplacementString = "Halfelf";

              const fileList = lines.map((item) =>
                item
                  .replace(
                    new RegExp(halfElfString, "g"),
                    halfElfReplacementString
                  )
                  .replace(
                    new RegExp(halfOrcString, "g"),
                    halfOrcReplacementString
                  )
                  .replace(new RegExp(/\(.*$/, "g"), "")
              );

              // Separate unique names into lists based on their position in the file name and remove the actor name
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
                  ...replaceAfterFirstDragonborn(file)
                    .split(/(?=[A-Z])/)
                    .filter(Boolean)
                    .map((part) => part)
                );

                fileNameParts.forEach((part, index) => {
                  if (!nameLists.has(index)) {
                    nameLists.set(index, new Set());
                  }
                  nameLists
                    .get(index)
                    .add(
                      part
                        .replace(
                          new RegExp(halfElfReplacementString, "g"),
                          halfElfString
                        )
                        .replace(
                          new RegExp(halfOrcReplacementString, "g"),
                          halfOrcString
                        )
                    );
                });
              });
              //===================================================================================
              // Create and display a dialogue box for each actor
              const dialogContent = document.createElement("div");
              dialogContent.verticalAlign = "middle";
              // Iterate over the lists and create rows with checkboxes
              nameLists.forEach((list, index) => {
                const row = document.createElement("div");
                row.style.display = "inline-block";
                row.style.marginRight = "20px";
                row.className = "CheckboxSubContainer";
                if (list.size > 1) {
                  // Add checkbox for *any only when there are more than one entry in the column
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
                  const checkbox = document.createElement("input");
                  checkbox.type = "checkbox";
                  checkbox.name = `checkbox-${selectedActor}-${index}`;
                  checkbox.value = item;
                  checkbox.id = `checkbox-${selectedActor}-${index}-${item}`;
                  // checkbox.checked = list.size == 1; // Check if it's the only item in the list
                  // checkbox.disabled = list.size == 1; // Disable if it's the only item in the list

                  const label = document.createElement("label");
                  label.htmlFor = checkbox.id;
                  label.appendChild(document.createTextNode(item));

                  const itemContainer = document.createElement("div");
                  itemContainer.appendChild(checkbox);
                  itemContainer.appendChild(label);
                  row.appendChild(itemContainer);
                });

                // Add the row to the dialogue content
                dialogContent.appendChild(row);
              });
              // Create buttons for the dialogue box
              const buttons = {
                assignTokens: {
                  label: `Assign Too-Many-Tokens to selected tokens`,
                  callback: async () => {
                    // Get the checked checkboxes for each list
                    const checkedCheckboxes = getCheckedCheckboxes(
                      nameLists,
                      selectedActor
                    );
                    // Create a wildcard path based on selected checkboxes
                    const wildcardPath = createWildcardPath(
                      nameLists,
                      checkedCheckboxes,
                      selectedActor
                    );
                    const regex = new RegExp(generateRegex());
                    console.log(regex);
                    const selectedPaths = lines.filter((link) =>
                      regex.test(link)
                    );
                    lines.forEach((line) => {
                      if (line.match(regex)) {
                        console.log(
                          `https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-${system}/main/${selectedActor}/${line}`
                        );
                      }
                    });
                    applyRandomTokenImages(selectedActor, selectedPaths);
                    //applyWildcardPathToActor(actor, wildcardPath);
                  },
                },
                cancel: {
                  label: "Cancel",
                },
              };
              // Display the lines in a new dialog
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
  if (index !== -1) {
    return inputString.substring(0, index + "Dragonborn".length);
  }
  return inputString;
}

// Function to create a wildcard path based on selected checkboxes
const createWildcardPath = (nameLists, checkedCheckboxes, actorName) => {
  let wildcardPath = `modules/too-many-tokens-${system}/${actorName}/`;
  nameLists.forEach((list, index) => {
    if (list.size > 0) {
      if (
        checkedCheckboxes[index].includes("*any") ||
        checkedCheckboxes[index].length <= 0 ||
        list.length <= 1
      ) {
        // If *any is checked, use *
        wildcardPath += "*";
      } else {
        if (checkedCheckboxes[index].length == 1) {
          wildcardPath += `${checkedCheckboxes[index][0]}`;
        } else {
          wildcardPath += `{${checkedCheckboxes[index].join(",")}}`;
        }
      }
    }
  });
  wildcardPath += "*";
  wildcardPath = wildcardPath.replace(/\*+/g, "*");
  return wildcardPath;
};

// Function to get the checked checkboxes for each list
const getCheckedCheckboxes = (nameLists, actorName) => {
  const checkedCheckboxes = [];
  nameLists.forEach((list, index) => {
    checkedCheckboxes[index] = Array.from(list).filter((item) => {
      const checkbox = document.getElementById(
        `checkbox-${actorName}-${index}-${item}`
      );
      return checkbox && checkbox.checked;
    });
  });
  return checkedCheckboxes;
};

// Function to apply new token images for all selected tokens of an actor
const applyTokenImages = async (actor, wildcardPath) => {
  const tokenDocument = await actor.getTokenDocument();
  const actorId = tokenDocument.actorId;
  let baseActor = game.actors.get(actorId);

  if (!baseActor) {
    ui.notifications.warn("Actor not found for the selected token.");
    return;
  }

  const selectedTokens = canvas.tokens.controlled.filter(
    (token) => token.actor.name == baseActor.name
  );
  console.log(selectedTokens);
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
    selectedTokens.forEach(async (token) => {
      if (true) {
        let imageChoice = Math.floor(Math.random() * tokenImgArray.length);
        let image = tokenImgArray[imageChoice];
        await token.document.update({
          "texture.src": image,
        });
      }
    });
    ui.notifications.info(
      `Found ${tokenImgArray.length} images for "${wildcardPath}"`
    );
  } else {
    ui.notifications.warn(`No images found for "${wildcardPath}"`);
  }
  await baseActor.update({
    "prototypeToken.texture.src": oldImgPath,
    "prototypeToken.randomImg": wasRandomImgBefore,
  });
};

function generateRegex() {
  let regex = "";

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

  regex += ""; // End of string anchor

  return new RegExp(regex);
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
      ui.notifications.info(`Token image updated: ${image}`);
    } catch (error) {
      ui.notifications.error(`Error updating token image: ${error.message}`);
    }
  });
}

function removeLinesEndingWithTxt(text) {
  // Split the text into an array of lines
  const lines = text.split("\n");

  // Filter out the lines that don't end with .txt
  const filteredLines = lines.filter((line) => !line.trim().endsWith(".txt"));

  // Join the filtered lines back together into a single string
  const newText = filteredLines.join("\n");

  return newText;
}
