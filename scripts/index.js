import {
  getTokenLinksFromPath,
  applyRandomTokenImages,
  getSystemFromWildcardPath,
} from "./helperFunctions.js";
class TooManyTokensOnline {}

/**
 * ------------------------------------------------------------------------------
 * Initialize the module
 */

Hooks.once("init", () => {
  // add the API
  game.toomanytokensonline = new TooManyTokensOnline();
});

Hooks.on("ready", () => {
  /**
   * @param {TokenDocument} tokenDocument
   */
  Hooks.on("createToken", async (tokenDocument) => {
    const actorId = tokenDocument.actorId;
    let baseActor = game.actors.get(actorId);

    const tokenName = baseActor.prototypeToken.texture.src;
    // ui.notifications.info(`Found ${tokenName}`);
    const links = await getTokenLinksFromPath(tokenDocument, tokenName);
    await applyRandomTokenImages(
      tokenDocument,
      getSystemFromWildcardPath(tokenName),
      links
    );
  });
});

Hooks.once("init", () => {
  game.settings.register("too-many-tokens-online", "loggingLevel", {
    name: "Notifications",
    config: true,
    hint: "How many notifications should the module give?",
    scope: "world",
    type: String,
    default: 2,
    choices: {
      0: "None",
      1: "Errors only",
      2: "Warning & Errors",
      3: "Everything",
    },
  });
});
