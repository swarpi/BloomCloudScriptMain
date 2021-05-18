var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
handlers.setExpiditionOne = function (args, context) {
    // set initial expidition
    var realExpidition = args.expidition;
    var updateUserDataResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            expiditionOne: realExpidition
        }
    });
    // set time of that expidition to server time
    var expiditionInfo = getExpiditionInfo();
    var duration = expiditionInfo.expiditionDuration;
    expiditionInfo.expiditionFinishTime = getFutureTimeInSeconds(duration * 3600);
    var expInfoStr = JSON.stringify(expiditionInfo);
    var updataPlayerlevelResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: { "expiditionOne": expInfoStr }
    });
    return { messageValue: "set on expidition" };
};
handlers.getExpiditionOne = function (args, context) {
    var getExpiditionInfo = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["expiditionOne"],
    });
    var expiditionInfoObject = JSON.parse(getExpiditionInfo.Data.expiditionOne.Value);
    return expiditionInfoObject;
};
function getExpiditionInfo() {
    var getExpiditionInfo = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["expiditionOne"],
    });
    var expiditionInfoObject = JSON.parse(getExpiditionInfo.Data.expiditionOne.Value);
    return expiditionInfoObject;
}
handlers.finishExpidition = function (args, context) {
    var expiditionInfo = getExpiditionInfo();
    var rewards;
    var gold;
    // clear epxidition after player decided to finish it
    var updataPlayerlevelResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: { "expiditionOne": "" }
    });
    // generate rewards and gold if expidition finish time is smaller than current time
    if (expiditionInfo.expiditionFinishTime < getCurrentTimeInSeconds() || args.manualFinish) {
        switch (expiditionInfo.expiditionType) {
            case 0: {
                rewards = finishRuneExpidition(expiditionInfo);
                break;
            }
            case 1: {
                rewards = finishHeroExpExpidition(expiditionInfo);
                break;
            }
        }
        return rewards;
    }
    return { messageValue: "expidition canceled" };
};
function finishHeroExpExpidition(expiditionInfo) {
    var rewards;
    var gold;
    rewards = getHeroExpPotionFromExpidition(expiditionInfo.expiditionDuration, expiditionInfo.expiditionDifficulty);
    // give player exp potions
    server.GrantItemsToUser({
        PlayFabId: currentPlayerId,
        ItemIds: rewards,
        CatalogVersion: "Items",
    });
    // give player gold
    gold = server.GetTitleInternalData({
        Keys: ["ExpiditionGold"]
    });
    var expiditionGold = JSON.parse(gold.Data.ExpiditionGold)[expiditionInfo.expiditionDifficulty];
    server.AddUserVirtualCurrency({
        PlayFabId: currentPlayerId,
        Amount: expiditionGold,
        VirtualCurrency: "GO",
    });
    log.debug(expiditionGold);
    log.debug(rewards);
    return { gold: expiditionGold, itemRewards: rewards };
}
function finishRuneExpidition(expiditionInfo) {
    var rewards;
    var runeDust;
    rewards = getRuneFromExpidition(expiditionInfo.expiditionDuration, expiditionInfo.expiditionDifficulty);
    // give player runes
    // give rune dust to player
    runeDust = server.GetTitleInternalData({
        Keys: ["ExpiditionRuneDust"]
    });
    var expditionRuneDust = JSON.parse(runeDust.Data.ExpiditionRuneDust)[expiditionInfo.expiditionDifficulty];
    server.AddUserVirtualCurrency({
        PlayFabId: currentPlayerId,
        Amount: expditionRuneDust,
        VirtualCurrency: "RD",
    });
    log.debug(expditionRuneDust);
    log.debug(rewards);
    return rewards;
}
var expiditionTimeModifier = {
    "2": 1,
    "6": 2.5,
    "10": 3.5,
    "16": 4.8,
};
function getHeroExpPotionFromExpidition(duration, difficulty) {
    var amountTime = expiditionTimeModifier[duration];
    /*    switch(duration){
            case 2:
                amountTime = 1;
                break;
            case 6:
                amountTime = 2;
                break;
            case 10:
                amountTime =  3;
                break;
            case 24:
                amountTime = 4;
                break;
        }*/
    var amountDifficulty = 0;
    switch (difficulty) {
        case 0:
            amountDifficulty = 5;
            break;
        case 1:
            amountDifficulty = 7;
            break;
        case 2:
            amountDifficulty = 5;
            break;
        case 3:
            amountDifficulty = 7;
            break;
    }
    var amount = Math.round(amountTime * amountDifficulty);
    var str1 = "HeroExp";
    var str2 = difficulty;
    var tableString = str1.concat(str2);
    var expiditionReward2 = server.GetRandomResultTables({
        TableIDs: [tableString],
        CatalogVersion: "Items"
    });
    var nodes = expiditionReward2.Tables[tableString].Nodes;
    var rewards = getRewardsFromNodes(nodes, amount);
    return rewards;
}
function getRuneFromExpidition(duration, difficulty) {
    var amountTime = expiditionTimeModifier[duration];
    var amount = Math.round(amountTime * 1.5);
    // TODO : generate runegrade based on difficulty
    // TODO : generate runeset maybe based on expiditionType
    var runeGrade = "Silver";
    var runeSetBonus = "ATKSet";
    var rewards = grantRuneToPlayerInventory(runeGrade, runeSetBonus, amount);
    return rewards;
}
// draws rewards from an array based on the amount
function getRewardsFromNodes(nodes, amount) {
    var lenghts = new Array(nodes.length);
    var totalAmount = 0;
    for (var i = 0; i < nodes.length; i++) {
        totalAmount = totalAmount + nodes[i].Weight;
    }
    var odds = new Array(nodes.length);
    for (var i = 0; i < nodes.length; i++) {
        odds[i] = nodes[i].Weight / totalAmount;
    }
    var value = weightedRandom(odds);
    var rewards = new Array(amount);
    for (var i = 0; i < amount; i++) {
        //rewards[i] = weightedRandom(odds);
        rewards[i] = nodes[weightedRandom(odds)[0]].ResultItem;
    }
    return rewards;
}
function weightedRandom(prob) {
    var sum = 0;
    var r = Math.random();
    for (var i in prob) {
        sum += prob[i];
        if (r <= sum)
            return i;
    }
}
function getCurrentTimeInSeconds() {
    var seconds = 1000;
    var minutes = seconds * 60;
    var hours = minutes * 60;
    var days = hours * 24;
    var years = days * 365;
    var d = new Date();
    var t = d.getTime();
    var y = Math.round(t / seconds);
    return y;
}
function getFutureTimeInSeconds(futureSeconds) {
    var seconds = 1000;
    var minutes = seconds * 60;
    var hours = minutes * 60;
    var days = hours * 24;
    var years = days * 365;
    var d = new Date();
    var t = d.getTime();
    var y = Math.round(t / (seconds) + futureSeconds);
    return y;
}
handlers.giveHeroExpPotion = function (args, context) {
    var result = getHeroFromPlayerInventory(args.hero);
    var hero = result.hero;
    var inventory = result.inventory;
    var heroExp = hero.CustomData;
    var potionAmount = getHeroPotionExpAmount();
    var potionList = args.potions;
    var potionArray = new Array(0);
    var allPotionPrices = getHeroPotionGoldPrice();
    var totalPotionPrice = 0;
    var smallPotionConsumed = 0;
    var mediumPotionConsumed = 0;
    var largePotionConsumed = 0;
    // count the potions
    potionList.forEach(function (x) {
        switch (x) {
            case "small":
                potionArray.push(potionAmount.small);
                totalPotionPrice += Number(allPotionPrices.small);
                smallPotionConsumed++;
                break;
            case "medium":
                potionArray.push(potionAmount.medium);
                totalPotionPrice += Number(allPotionPrices.medium);
                mediumPotionConsumed++;
                break;
            case "large":
                potionArray.push(potionAmount.large);
                totalPotionPrice += Number(allPotionPrices.large);
                largePotionConsumed++;
                break;
        }
    });
    var playerGold = inventory.VirtualCurrency["GO"];
    var tempHeroExp;
    // check if player has enough gold
    if (playerGold >= totalPotionPrice) {
        tempHeroExp = giveHeroExpPotion(heroExp, potionArray);
    }
    else {
        log.debug("not enough gold");
        return;
    }
    // check if player has enough potions left
    if (!itemHasEnoughRemainingUsesLeft(inventory, "SmallHeroExpPotion", smallPotionConsumed)) {
        log.debug("not enough small potions");
        return;
    }
    if (!itemHasEnoughRemainingUsesLeft(inventory, "MediumHeroExpPotion", mediumPotionConsumed)) {
        log.debug("not enough medium potions");
        return;
    }
    if (!itemHasEnoughRemainingUsesLeft(inventory, "LargeHeroExpPotion", largePotionConsumed)) {
        log.debug("not enough large potions");
        return;
    }
    // reduce playerGold
    server.SubtractUserVirtualCurrency({
        Amount: totalPotionPrice,
        PlayFabId: currentPlayerId,
        VirtualCurrency: "GO",
    });
    //consume potions from player inventory
    if (smallPotionConsumed > 0) {
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == "SmallHeroExpPotion"; }).ItemInstanceId,
            ConsumeCount: smallPotionConsumed,
        });
    }
    if (mediumPotionConsumed > 0) {
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == "MediumHeroExpPotion"; }).ItemInstanceId,
            ConsumeCount: mediumPotionConsumed,
        });
    }
    if (largePotionConsumed > 0) {
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == "LargeHeroExpPotion"; }).ItemInstanceId,
            ConsumeCount: largePotionConsumed,
        });
    }
    // update hero
    server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: hero.ItemInstanceId,
        Data: {
            experience: tempHeroExp.experience,
            level: tempHeroExp.level,
        },
    });
    return hero;
};
function getHeroPotionGoldPrice() {
    var inventory = server.GetCatalogItems({
        CatalogVersion: "Items",
    });
    var smallAmount = 0;
    var mediumAmount = 0;
    var largeAmount = 0;
    inventory.Catalog.forEach(function (potion) {
        switch (potion.ItemId) {
            case "SmallHeroExpPotion":
                smallAmount = (potion.VirtualCurrencyPrices["GO"]);
                break;
            case "MediumHeroExpPotion":
                mediumAmount = (potion.VirtualCurrencyPrices["GO"]);
                break;
            case "LargeHeroExpPotion":
                largeAmount = (potion.VirtualCurrencyPrices["GO"]);
                break;
        }
    });
    return { small: smallAmount, medium: mediumAmount, large: largeAmount };
}
function getHeroPotionExpAmount() {
    var inventory = server.GetCatalogItems({
        CatalogVersion: "Items",
    });
    var smallAmount = 0;
    var mediumAmount = 0;
    var largeAmount = 0;
    inventory.Catalog.forEach(function (potion) {
        switch (potion.ItemId) {
            case "SmallHeroExpPotion":
                smallAmount = JSON.parse(potion.CustomData);
                break;
            case "MediumHeroExpPotion":
                mediumAmount = JSON.parse(potion.CustomData);
                break;
            case "LargeHeroExpPotion":
                largeAmount = JSON.parse(potion.CustomData);
                break;
        }
    });
    return { small: smallAmount, medium: mediumAmount, large: largeAmount };
}
/**
 * Grant the character exp according to the amount of potions
 * if the player reaches the requirement of his level, increase its level set his current exp to 0 and add the leftover exp
 * the exp requirement can be taken from the json string :
 *
 *  {"1":"100","2":"200","3":"300","4":"400","5":"500","6":"600"}
 *

 *
 * (the first entry is the level and the second the required exp)
 *
 *  @example player gets 350 exp, he is lvl 1 and has 20 exp => lvl 3 with 170 exp
 */
function giveHeroExpPotion(hero, potions) {
    var heroExpRequirement = server.GetTitleInternalData({
        Keys: ["HeroExpRequirement"],
    });
    var EXP_MAP = JSON.parse(heroExpRequirement.Data.HeroExpRequirement);
    var whileStopper = 0;
    if (potions.length === 0)
        return hero;
    var totalPotionExp = potions.reduce(function (acc, potion) { return acc + Number(potion.experience); }, 0);
    var updatedHero = __assign({}, hero);
    var remainingPotionExp = totalPotionExp;
    do {
        var level = updatedHero.level, currentExp = updatedHero.experience;
        var requiredExp = Number(EXP_MAP[level]);
        var requiredExpToNextLvlUp = requiredExp - currentExp;
        var updatedHeroExp = requiredExpToNextLvlUp - remainingPotionExp;
        if (updatedHeroExp <= 0) {
            updatedHero.level = Number(updatedHero.level) + 1;
            updatedHero.experience = 0;
            remainingPotionExp = Math.abs(updatedHeroExp);
        }
        else {
            updatedHero.experience = requiredExp - updatedHeroExp;
            remainingPotionExp = 0;
        }
        whileStopper++;
    } while (remainingPotionExp > 0 && whileStopper < 1000);
    return updatedHero;
}
// takes input parameter heroID,
handlers.ascendHero = function (args, context) {
    var result = getHeroFromPlayerInventory(args.hero);
    var hero = result.hero;
    var inventory = result.inventory;
    // check if hero is eligble for ascension
    if (Number(hero.CustomData.level) >= 30 && (Number(hero.CustomData.level) % 10 == 0)) {
        var catalogItems = server.GetCatalogItems({
            CatalogVersion: "Characters",
        });
        // info about the hero
        var heroInfo = catalogItems.Catalog.find(function (x) { return x.ItemId == args.hero; });
        var heroZoodiacSign = JSON.parse(heroInfo.CustomData).zoodiacSign;
        var heroAscensionStage = hero.CustomData.ascensionStage;
        // get the necessary jobs from zoodiac sign of hero
        var zoodiacSignData = server.GetTitleInternalData({
            Keys: ["ZoodiacSignMaterialRequirements"],
        });
        var zoodiacSignJobArray = JSON.parse(zoodiacSignData.Data.ZoodiacSignMaterialRequirements); // array of all zoodiacSigns with their Jobs
        // get the materials from the jobs
        var ascensionJobArray = zoodiacSignJobArray[heroZoodiacSign]; // array of the required Jobs from the zoodiacSign of the hero
        var primaryJob = ascensionJobArray.Primary;
        var secondaryJob = ascensionJobArray.Secondary;
        var tertiaryJob = ascensionJobArray.Tertiary;
        // search from all ascension items the right ones based on the custom Data
        // that fit the ascensionjobs and ascensionstage
        var mats_1 = getMaterialFromAscensionJob(primaryJob, secondaryJob, tertiaryJob, heroAscensionStage);
        // get the number of amount based on the keyword (primary...6, secondary ...4 , tertiary ...2)
        // check if player has these materials
        if (!itemHasEnoughRemainingUsesLeft(inventory, mats_1.primaryMat.ItemId, 6)) {
            log.debug("no or not enough primary");
            return;
        }
        if (!itemHasEnoughRemainingUsesLeft(inventory, mats_1.secondaryMat.ItemId, 4)) {
            log.debug("no or not enough secondaryMat");
            return;
        }
        if (!itemHasEnoughRemainingUsesLeft(inventory, mats_1.tertiaryMat.ItemId, 2)) {
            log.debug("no or not enough tertiary");
            return;
        }
        // consume item from inventory
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == mats_1.primaryMat.ItemId; }).ItemInstanceId,
            ConsumeCount: 6,
        });
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == mats_1.secondaryMat.ItemId; }).ItemInstanceId,
            ConsumeCount: 4,
        });
        server.ConsumeItem({
            PlayFabId: currentPlayerId,
            ItemInstanceId: inventory.Inventory.find(function (x) { return x.ItemId == mats_1.tertiaryMat.ItemId; }).ItemInstanceId,
            ConsumeCount: 2,
        });
        // increase the ascension stage of hero (maybe give him some extra stats)
        server.UpdateUserInventoryItemCustomData({
            PlayFabId: currentPlayerId,
            ItemInstanceId: hero.ItemInstanceId,
            Data: {
                ascensionStage: (Number(heroAscensionStage) + 1).toString()
            },
        });
        server.UpdateUserInventoryItemCustomData({
            PlayFabId: currentPlayerId,
            ItemInstanceId: hero.ItemInstanceId,
            Data: {
                ascensionStage: (Number(heroAscensionStage) + 1).toString()
            },
        });
    }
};
handlers.ascendTest = function (args, context) {
    var value = getMaterialFromAscensionJob(args.first, args.second, args.third, args.stage);
    //og.debug(value);
};
// search from all ascension items the right ones based on the custom Data
// that fit the ascensionjob and ascensionstage
function getMaterialFromAscensionJob(primaryJob, secondaryJob, tertiaryJob, heroAscensionStage) {
    var allItems = server.GetCatalogItems({
        CatalogVersion: "Items",
    });
    var ascensionItems = allItems.Catalog.filter(function (x) { return x.ItemClass == "AscensionMaterial"; });
    var primaryMat = ascensionItems.find(function (item) {
        var customData = JSON.parse(item.CustomData);
        if (primaryJob == customData.ascensionJob && heroAscensionStage == customData.ascensionStage) {
            return true;
        }
    });
    var secondaryMat = ascensionItems.find(function (item) {
        var customData = JSON.parse(item.CustomData);
        if (secondaryJob == customData.ascensionJob && heroAscensionStage == customData.ascensionStage) {
            return true;
        }
    });
    var tertiaryMat = ascensionItems.find(function (item) {
        var customData = JSON.parse(item.CustomData);
        if (tertiaryJob == customData.ascensionJob && heroAscensionStage == customData.ascensionStage) {
            return true;
        }
    });
    return { primaryMat: primaryMat, secondaryMat: secondaryMat, tertiaryMat: tertiaryMat };
}
function itemHasEnoughRemainingUsesLeft(inventory, itemID, amount) {
    if (amount <= 0)
        return true;
    var item = inventory.Inventory.find(function (x) { return x.ItemId == itemID; });
    if (item) {
        if (item.RemainingUses >= amount) {
            return true;
        }
    }
    return false;
}
function getHeroFromPlayerInventory(heroName) {
    var inventory = server.GetUserInventory({
        PlayFabId: currentPlayerId,
    });
    // need to adapt that it only give hero custom data
    var hero = inventory.Inventory.find(function (x) { return x.ItemId == heroName; });
    return { hero: hero, inventory: inventory };
}
handlers.getHeroExpRequirement = function (args, context) {
    var info = server.GetTitleInternalData({
        Keys: ["HeroExpRequirement"],
    });
    return { data: info.Data.HeroExpRequirement };
};
var mainStatsData;
handlers.grantRuneToPlayer = function (args, context) {
    var runeArray = new Array(); // all infos about the runes
    var runes = new Array(); // info about the runeslot
    // generate array with the rune slots
    mainStatsData = getRuneStatsData();
    for (var i = 0; i < args.amount; i++) {
        var rune = generateRune("Silver", "ATKSet");
        switch (rune.runeSlot) {
            case 0:
                runes.push("AlphaRune");
                break;
            case 1:
                runes.push("BetaRune");
                break;
            case 2:
                runes.push("GammaRune");
                break;
        }
        runeArray.push(rune);
    }
    // give the player the runes based on the rune slots
    var grantedItems = server.GrantItemsToUser({
        PlayFabId: currentPlayerId,
        ItemIds: runes,
        CatalogVersion: "Runes",
    });
    var counter = 0;
    // need to sort both arrays, in order to give the right runes the right data
    runeArray.sort(function (a, b) {
        if (a.runeSlot < b.runeSlot) {
            return -1;
        }
        if (a.runeSlot > b.runeSlot) {
            return 1;
        }
        return 0;
    });
    grantedItems.ItemGrantResults.sort(function (a, b) {
        if (a.ItemId < b.ItemId) {
            return -1;
        }
        if (a.ItemId > b.ItemId) {
            return 1;
        }
        return 0;
    });
    // update the rune custom data with the rune information
    grantedItems.ItemGrantResults.forEach(function (item) {
        var tempRune = runeArray[counter];
        updateRune(item.ItemInstanceId, tempRune.mainStat, tempRune.subStats, tempRune.runeGrade, tempRune.runeSet, 0, 0);
        counter++;
    });
    return { items: counter };
};
function grantRuneToPlayerInventory(runeGrade, runeSetBonus, amount) {
    var runeArray = new Array(); // all infos about the runes
    var runes = new Array(); // info about the runeslot
    // generate array with the rune slots
    mainStatsData = getRuneStatsData();
    for (var i = 0; i < amount; i++) {
        var rune = generateRune(runeGrade, runeSetBonus);
        switch (rune.runeSlot) {
            case 0:
                runes.push("AlphaRune");
                break;
            case 1:
                runes.push("BetaRune");
                break;
            case 2:
                runes.push("GammaRune");
                break;
        }
        runeArray.push(rune);
    }
    // give the player the runes based on the rune slots
    var grantedItems = server.GrantItemsToUser({
        PlayFabId: currentPlayerId,
        ItemIds: runes,
        CatalogVersion: "Runes",
    });
    var counter = 0;
    // need to sort both arrays, in order to give the right runes the right data
    runeArray.sort(function (a, b) {
        if (a.runeSlot < b.runeSlot) {
            return -1;
        }
        if (a.runeSlot > b.runeSlot) {
            return 1;
        }
        return 0;
    });
    grantedItems.ItemGrantResults.sort(function (a, b) {
        if (a.ItemId < b.ItemId) {
            return -1;
        }
        if (a.ItemId > b.ItemId) {
            return 1;
        }
        return 0;
    });
    // update the rune custom data with the rune information
    grantedItems.ItemGrantResults.forEach(function (item) {
        var tempRune = runeArray[counter];
        updateRune(item.ItemInstanceId, tempRune.mainStat, tempRune.subStats, tempRune.runeGrade, tempRune.runeSet, 0, 0);
        counter++;
    });
    return { items: counter, runes: runeArray };
}
function updateRune(ItemInstanceId, mainStat, subStats, grade, setBonus, level, stars) {
    server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: ItemInstanceId,
        Data: {
            mainStat: JSON.stringify(mainStat),
            subStats: JSON.stringify(subStats),
            grade: grade,
            runeSet: setBonus,
            stars: stars,
        },
    });
}
handlers.getRune = function (args, context) {
    var runeArray = new Array();
    for (var i = 0; i < args.amount; i++) {
        var rune = generateRune("Uncommon", "ATKSet");
        runeArray.push(rune);
    }
    //log.debug(rune.subStats);
    return { runes: runeArray };
};
function getRuneStatsData() {
    var runeData = server.GetTitleInternalData({
        Keys: ["RuneStatsValue"],
    });
    var runeDataArray = JSON.parse(runeData.Data.RuneStatsValue);
    return runeDataArray;
}
function generateRune(grade, setBonus) {
    // generate a random rune:
    // 0. runeSlot
    var runeSlot = generateRuneSlot(); // 1. mainstat
    //   a. mainStatType
    //   b. value = 0; // value will be taken from another json file
    var mainStat = generateMainStat(runeSlot); // 2. substat
    //   if runeSlot == alpha generate 3 substats (similiar to mainstat)
    //   if runeslot == beta generate 2 substats
    //   if runeslot == gamma generate 1 subst
    var subStats = generateSubStat(runeSlot, mainStat);
    var runeGrade = grade;
    var runeSet = setBonus;
    var runeId = uuidv4();
    return {
        runeSlot: runeSlot,
        mainStat: mainStat,
        subStats: subStats,
        runeGrade: runeGrade,
        runeSet: runeSet,
        runeId: runeId,
    };
}
var RESTRICTIONS_ALPHA = [0, 1, 2, 3];
var RESTRICTIONS_BETA = [1, 2, 3, 4, 5, 6, 7, 8];
var RESTRICTIONS_GAMMA = [1, 2, 3, 4, 5];
var RESTRICTIONS_SUBSTAT_TYPES = [1, 2, 3, 4, 5, 6, 7];
function generateRuneSlot() {
    var weights = [1, 2, 3];
    var finalRuneSlot = drawFromWeightedArray(weights);
    /*?*/
    return finalRuneSlot;
} // generateRuneSlot(); /*?*/
//endregion
/**
 * Generate main stat according to resrictions from runeSlot
 */
function generateMainStat(runeSlot) {
    var _mainStatsData$find;
    var restrictionsList = [];
    switch (runeSlot) {
        case 0: {
            restrictionsList = RESTRICTIONS_ALPHA;
            break;
        }
        case 1: {
            restrictionsList = RESTRICTIONS_BETA;
            break;
        }
        case 2: {
            restrictionsList = RESTRICTIONS_GAMMA;
            break;
        }
        default: {
            throw new Error("Not a valid rune slot: " + runeSlot);
        }
    }
    var numOfDifferentMainStatTypes = restrictionsList.length;
    var drawnIndex = drawFromWeightedArray(numOfDifferentMainStatTypes);
    var drawnMainStatType = restrictionsList[drawnIndex];
    var initialValue = (_mainStatsData$find = mainStatsData.find(function (data) { return (data.KeyWord === drawnMainStatType) && (data.Type == "mainStat"); })) === null || _mainStatsData$find === void 0
        ? void 0
        : _mainStatsData$find.InitialValue;
    if (!initialValue) {
        throw new Error("No main stat found for: " + drawnIndex);
    }
    var finalMainStat = {
        type: drawnMainStatType,
        value: initialValue[runeSlot],
    };
    return finalMainStat;
} // generateMainStat()/*?*/
/**
 * - Generate <amount> of sub stats based on runeSlot.
 * - Sub stat types are all different
 * - and also different from main stat
 */
function generateSubStat(runeSlot, mainStat) {
    var numOfSubStats;
    switch (runeSlot) {
        case 0: {
            numOfSubStats = 3;
            break;
        }
        case 1: {
            numOfSubStats = 2;
            break;
        }
        case 2: {
            numOfSubStats = 1;
            break;
        }
        default: {
            throw new Error("Not a valid rune slot: " + runeSlot);
        }
    }
    var numOfRestrictedSubStatTypes = RESTRICTIONS_SUBSTAT_TYPES.length;
    var drawnSubStatTypeList = [];
    var whileLoopLimiter = 0;
    do {
        var drawnIndex = drawFromWeightedArray(numOfRestrictedSubStatTypes);
        var drawnSubStatType = RESTRICTIONS_SUBSTAT_TYPES[drawnIndex];
        var sameAsMainType = drawnSubStatType === mainStat.type;
        if (sameAsMainType)
            continue;
        var alreadyInList = drawnSubStatTypeList.includes(drawnSubStatType);
        if (alreadyInList)
            continue;
        drawnSubStatTypeList.push(drawnSubStatType);
        whileLoopLimiter++;
    } while (drawnSubStatTypeList.length < numOfSubStats &&
        whileLoopLimiter < 10000);
    var finalSubStatList = drawnSubStatTypeList.map(function (drawnSubStatType) {
        var _mainStatsData$find2;
        var initialValue = (_mainStatsData$find2 = mainStatsData.find(function (data) { return (data.KeyWord === drawnSubStatType) && (data.Type == "subStat"); })) === null || _mainStatsData$find2 === void 0
            ? void 0
            : _mainStatsData$find2.InitialValue;
        if (!initialValue) {
            throw new Error("No sub stat found for: " + drawnSubStatType);
        }
        var finalSubStat = {
            type: drawnSubStatType,
            value: initialValue[runeSlot],
        };
        return finalSubStat;
    });
    return finalSubStatList;
}
// generateSubStat(0, {type: 0, value: 0});/*?*/
// for (let i = 0; i < 10; i++) {
//   drawSubStat({type: 0, value: 0}).type;/*?*/
// }
/**
 * @param weightedArray - Eg. [1,3,6,2] or just 3 (would then default to [1,1,1])
 */
function drawFromWeightedArray(weightedArray) {
    if (!Array.isArray(weightedArray)) {
        weightedArray = Array.from({
            length: weightedArray
        }, function () { return 1; });
    }
    var total = weightedArray.reduce(function (acc, num) { return acc + num; }, 0);
    var odds = weightedArray.map(function (weight) { return weight / total; });
    var oddsIntervals = [];
    var accumulatedOdds = 0;
    odds.forEach(function (odd) {
        accumulatedOdds += odd;
        oddsIntervals.push(accumulatedOdds);
    });
    if (Number(oddsIntervals[oddsIntervals.length - 1].toFixed(13)) !== 1) {
        throw new Error("Last odd intervall should be 1");
    }
    var rnd = Math.random();
    var oddsIndex = oddsIntervals.findIndex(function (odd) { return rnd <= odd; });
    return oddsIndex;
} // drawFromWeightedArray([1,2,3])/*?*/
handlers.disenchantRunes = function (args, context) {
    var totalDustAmount = 0;
    var gradeDust = {
        "Wood": 1,
        "Bronze": 1.1,
        "Silver": 1.2,
        "Gold": 1.3,
    };
    var levelDust = {
        "0": 100,
        "1": 150,
        "2": 200,
        "3": 250,
        "4": 300,
        "5": 350,
    };
    var allItems = server.GetUserInventory({
        PlayFabId: currentPlayerId,
    });
    var allRunes = allItems.Inventory.filter(function (x) { return x.CatalogVersion == "Runes"; });
    var runeItemIds = new Array();
    var selectedRunes = allRunes.filter(function (x) { return args.runeIds.includes(x.ItemInstanceId); });
    selectedRunes.forEach(function (x) {
        // calculate the amount of dust gained by a rune
        var gradeValue = gradeDust[x.CustomData["grade"]];
        var levelValue = levelDust[0];
        if (x.CustomData["level"]) {
            levelValue = levelDust[x.CustomData["level"]];
        }
        var runeDust = gradeValue * levelValue;
        totalDustAmount += runeDust;
        // push the ids to an array to remove it later
        var revokeItem = {
            PlayFabId: currentPlayerId,
            ItemInstanceId: x.ItemInstanceId,
        };
        runeItemIds.push(revokeItem);
    });
    server.RevokeInventoryItems({
        Items: runeItemIds,
    });
    server.AddUserVirtualCurrency({
        Amount: totalDustAmount,
        PlayFabId: currentPlayerId,
        VirtualCurrency: "RD",
    });
    return { messageValue: ("dust generated " + totalDustAmount) };
};
handlers.combineRunes = function (args, context) {
    // check if player has enough gold
    var allItems = server.GetUserInventory({
        PlayFabId: currentPlayerId,
    });
    if (args.mainRuneId == args.materialRuneId) {
        log.debug("ups you cant use the same rune");
        return;
    }
    // get the runes from based on the item id
    var mainRune = allItems.Inventory.find(function (x) { return x.ItemInstanceId == args.mainRuneId; });
    var materialRune = allItems.Inventory.find(function (x) { return x.ItemInstanceId == args.materialRuneId; });
    if (mainRune.CustomData["stars"] != materialRune.CustomData["stars"]) {
        log.debug("ups not the same stars");
        return;
    }
    if (mainRune.ItemClass != materialRune.ItemClass) {
        log.debug("ups not the same grade");
        return;
    }
    // check if rune has reached max star level
    if (isRuneMaxStar(mainRune.CustomData["grade"], mainRune.CustomData["stars"])) {
        log.debug("ups rune is already max star");
        return;
    }
    // delete the materialRune
    server.RevokeInventoryItem({
        PlayFabId: currentPlayerId,
        ItemInstanceId: materialRune.ItemInstanceId,
    });
    // increase the stars of the mainRune
    server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: mainRune.ItemInstanceId,
        Data: {
            stars: (Number(mainRune.CustomData["stars"]) + 1).toString(),
        },
    });
    return { messageValue: ("rune star increased sucessfully ") };
};
var runeSubstatIncreaseLevels = [5, 8, 11, 14];
handlers.levelUpRuneOneLevel = function (args, context) {
    var allItems = server.GetUserInventory({
        PlayFabId: currentPlayerId,
    });
    var rune = allItems.Inventory.find(function (x) { return x.ItemInstanceId == args.rune; });
    var totalDustOwned = allItems.VirtualCurrency["RD"];
    var runeLevel = 1;
    if (rune.CustomData["level"]) {
        runeLevel = Number(rune.CustomData["level"]);
    }
    var requiredDust = getRequiredRuneDust(runeLevel);
    // check if player has enough rune dust
    if (totalDustOwned < requiredDust) {
        log.debug("not enough dust owned");
        return { messageValue: ("not enough dust owned"), wasSuccesfull: false };
    }
    // check if rune is alread max level
    if (isRuneMaxLevel(rune.CustomData["stars"], runeLevel)) {
        log.debug("rune is alread max level, try to increase its stars");
        return { messageValue: ("rune is alread max level, try to increase its stars"), wasSuccesfull: false };
    }
    // increase level of the rune
    var newRuneLevel = Number(runeLevel) + 1;
    // increase mainStat
    var newMainstat = increaseMainStat(JSON.parse(rune.CustomData["mainStat"]), rune.ItemClass);
    // inrease substat if certain level threshold reached see const runeSubstatIncreaseLevels
    var substats = JSON.parse(rune.CustomData["subStats"]);
    if (runeSubstatIncreaseLevels.includes(newRuneLevel)) {
        substats = increaseSubStat(substats, rune.ItemClass);
    }
    // update rune stats (level,mainstat,substat)
    server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: rune.ItemInstanceId,
        Data: {
            level: newRuneLevel.toString(),
            mainStat: JSON.stringify(newMainstat),
            subStats: JSON.stringify(substats),
        },
    });
    // reduce rune dust
    server.SubtractUserVirtualCurrency({
        Amount: requiredDust,
        PlayFabId: currentPlayerId,
        VirtualCurrency: "RD",
    });
    return { messageValue: ("sucessfully leveled up rune"), wasSuccesfull: true };
};
handlers.levelUpRuneMaxLevel = function (args, context) {
    var allItems = server.GetUserInventory({
        PlayFabId: currentPlayerId,
    });
    var rune = allItems.Inventory.find(function (x) { return x.ItemInstanceId == args.rune; });
    var totalDustOwned = allItems.VirtualCurrency["RD"];
    var runeLevel = 1;
    if (rune.CustomData["level"]) {
        runeLevel = Number(rune.CustomData["level"]);
    }
    // check if rune is alread max level
    if (isRuneMaxLevel(rune.CustomData["stars"], runeLevel)) {
        log.debug("rune is alread max level, try to increase its stars");
        return { messageValue: ("rune is alread max level, try to increase its stars"), wasSuccesfull: false };
    }
    var totalDustRequired = 0;
    var newMainstat = JSON.parse(rune.CustomData["mainStat"]);
    var newSubStat = JSON.parse(rune.CustomData["subStats"]);
    var maxLevel = 0;
    var j = Number(runeLevel);
    var i = j + 1;
    for (i; i <= getRuneMaxLevel(rune.CustomData["stars"]); i++) {
        // count the required Dust
        totalDustRequired += getRequiredRuneDust(i);
        // increase mainstat every loop
        newMainstat = increaseMainStat(newMainstat, rune.ItemClass);
        // increase substats only if certain level reached
        if (runeSubstatIncreaseLevels.includes(i)) {
            newSubStat = increaseSubStat(newSubStat, rune.ItemClass);
        }
    }
    if (totalDustOwned < totalDustRequired) {
        log.debug("not enough dust owned");
        return { messageValue: ("not enough dust owned"), wasSuccesfull: false };
    }
    // update rune stats (level,mainstat,substat)
    server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: rune.ItemInstanceId,
        Data: {
            level: getRuneMaxLevel(rune.CustomData["stars"]),
            mainStat: JSON.stringify(newMainstat),
            subStats: JSON.stringify(newSubStat),
        },
    });
    // reduce rune dust
    server.SubtractUserVirtualCurrency({
        Amount: totalDustRequired,
        PlayFabId: currentPlayerId,
        VirtualCurrency: "RD",
    });
    return { messageValue: ("sucessfully max leveld rune"), wasSuccesfull: true };
};
var runeStarsMaxLevel = {
    0: 5,
    1: 8,
    2: 11,
    3: 14,
};
var runeGradeMaxStar = {
    "Wood": 0,
    "Bronze": 1,
    "Silver": 2,
    "Gold": 3,
};
function isRuneMaxStar(runeGrade, runeStars) {
    if (runeGradeMaxStar[runeGrade] > runeStars) {
        return false;
    }
    return true;
}
function isRuneMaxLevel(runeStars, runeLevel) {
    if (runeStarsMaxLevel[runeStars] > runeLevel) {
        return false;
    }
    return true;
}
function getRuneMaxLevel(stars) {
    return runeStarsMaxLevel[stars];
}
function getRequiredRuneDust(level) {
    var runeData = server.GetTitleInternalData({
        Keys: ["RuneLevelDust"],
    });
    var runeDataArray = JSON.parse(runeData.Data.RuneLevelDust);
    var dustAmount = runeDataArray.find(function (x) { return Number(x.level) == (level); }).requiredDust;
    return dustAmount;
}
function increaseMainStat(mainStat, itemClass) {
    // get the rune info
    var mainStatValue = mainStat["value"];
    var runeSlot = getRuneSlotFromItemClass(itemClass);
    // get the mainstat from the runearray with the rune info
    var runeStatsData = getRuneStatsData();
    var newMainStatData = runeStatsData.find(function (x) { return (x.Type == "mainStat") && (x.KeyWord == mainStat["type"]); });
    var newMainStatValue = newMainStatData["ValuePerLevel"][runeSlot];
    // increase main stat 
    mainStatValue += Number(newMainStatValue);
    var newMainStat = {
        type: mainStat["type"],
        value: mainStatValue,
    };
    return newMainStat;
}
function increaseSubStat(subStats, itemClass) {
    // get substats and one specific substat
    var runeSlot = getRuneSlotFromItemClass(itemClass);
    var subStatIndex = getRandomInt(0, (subStats.length - 1));
    var subStat = subStats[subStatIndex];
    var subStatValue = subStat["value"];
    // get the upgrade range of the substat
    var runeStatsData = getRuneStatsData();
    var newSubStatData = runeStatsData.find(function (x) { return (x.Type == "subStat") && (x.KeyWord == subStat["type"]); });
    var upgradeRangeString = newSubStatData["UpgradeRange"][runeSlot];
    // clean up the string to get the values from the range string
    var values = JSON.stringify(upgradeRangeString).split('-');
    var cleanValueOne = values[0].replace('/', '').replace('"', '');
    var cleanValueTwo = values[1].replace('/', '').replace('"', '');
    var upgradeInt = getRandomInt(Number(cleanValueOne), Number(cleanValueTwo));
    subStatValue += upgradeInt;
    var newSubStat = {
        type: subStat["type"],
        value: subStatValue,
    };
    // change the new substat in the old substat list
    subStats[subStatIndex] = newSubStat;
    return subStats;
}
function getRuneSlotFromItemClass(itemClass) {
    var runeSlot;
    switch (itemClass) {
        case "Alpha":
            runeSlot = 0;
            break;
        case "Beta":
            runeSlot = 1;
            break;
        case "Gamma":
            runeSlot = 2;
            break;
        default: {
            throw new Error("Not a valid rune slot: " + itemClass);
        }
    }
    return runeSlot;
}
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Welcome to your first Cloud Script revision!
//
// Cloud Script runs in the PlayFab cloud and has full access to the PlayFab Game Server API 
// (https://api.playfab.com/Documentation/Server), and it runs in the context of a securely
// authenticated player, so you can use it to implement logic for your game that is safe from
// client-side exploits. 
//
// Cloud Script functions can also make web requests to external HTTP
// endpoints, such as a database or private API for your title, which makes them a flexible
// way to integrate with your existing backend systems.
//
// There are several different options for calling Cloud Script functions:
//
// 1) Your game client calls them directly using the "ExecuteCloudScript" API,
// passing in the function name and arguments in the request and receiving the 
// function return result in the response.
// (https://api.playfab.com/Documentation/Client/method/ExecuteCloudScript)
// 
// 2) You create PlayStream event actions that call them when a particular 
// event occurs, passing in the event and associated player profile data.
// (https://api.playfab.com/playstream/docs)
// 
// 3) For titles using the Photon Add-on (https://playfab.com/marketplace/photon/),
// Photon room events trigger webhooks which call corresponding Cloud Script functions.
// 
// The following examples demonstrate all three options.
//
// This is a simple example of making a PlayFab server API call
handlers.UpdatePLayerStats = function (args, context) {
    var request = {
        PlayFabId: currentPlayerId, Statistics: [{
                StatisticName: "PlayerLevel",
                Value: args.playerLevelVal
            }, {
                StatisticName: "GameLevel",
                Value: args.gameLevelVal
            }]
    };
    // The pre-defined "server" object has functions corresponding to each PlayFab server API 
    // (https://api.playfab.com/Documentation/Server). It is automatically 
    // authenticated as your title and handles all communication with 
    // the PlayFab API, so you don't have to write extra code to issue HTTP requests. 
    var playerStatResult = server.UpdatePlayerStatistics(request);
    return { messageValue: "updated cloud stats" };
};
// Below are some examples of using Cloud Script in slightly more realistic scenarios
// This is a function that the game client would call whenever a player completes
// a level. It updates a setting in the player's data that only game server
// code can write - it is read-only on the client - and it updates a player
// statistic that can be used for leaderboards. 
//
// A funtion like this could be extended to perform validation on the 
// level completion data to detect cheating. It could also do things like 
// award the player items from the game catalog based on their performance.
handlers.completedLevel = function (args, context) {
    var level = args.levelName;
    var monstersKilled = args.monstersKilled;
    var updateUserDataResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            lastLevelCompleted: level
        }
    });
    log.debug("Set lastLevelCompleted for player " + currentPlayerId + " to " + level);
    var request = {
        PlayFabId: currentPlayerId, Statistics: [{
                StatisticName: "level_monster_kills",
                Value: monstersKilled
            }]
    };
    server.UpdatePlayerStatistics(request);
    log.debug("Updated level_monster_kills stat for player " + currentPlayerId + " to " + monstersKilled);
    return { messageValue: "Updated level_monster_kills stat for player " + currentPlayerId + " to " + monstersKilled };
};
// reduntand because hero are in player inventory and not character data
handlers.getHeroCharacter = function (args, context) {
    var hero = server.GrantCharacterToUser({
        PlayFabId: currentPlayerId,
        CharacterName: "Catharina",
        CharacterType: "Catharina",
    });
    // set up initial values
    server.UpdateCharacterReadOnlyData({
        PlayFabId: currentPlayerId,
        CharacterId: hero.CharacterId,
        Data: {
            heroLevel: "1",
            heroCurrentExp: "0",
        }
    });
    server.UpdateCharacterData({
        PlayFabId: currentPlayerId,
        CharacterId: hero.CharacterId,
        Data: {
            runes: "",
        }
    });
    return hero;
};
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// import * as myJson from './hi.json';
// interface MyObj {
//     field: number
//     nested: {
//         more: string
//     }
// }
// const test: MyObj = {
//     field: 1,
//     nested: {
//         more: 'aaa'
//     }
// }
// export const externalVar = 'ext'
// export function foo() {
//     console.log(externalVar)
// }
// import { externalVar, foo } from "./import-me"
// const hi = 'hello'
// foo()
// console.log(hi)
// console.log (externalVar)
function GetEntityToken(params, context) {
    var getTokenRequest = {};
    var getTokenResponse = entity.GetEntityToken(getTokenRequest);
    var entityId = getTokenResponse.Entity.Id;
    var entityType = getTokenResponse.Entity.Type;
}
handlers.GetEntityToken = GetEntityToken;
function GetObjects(params, context) {
    var getObjRequest = {
        Entity: {
            Id: params.entityId,
            Type: params.entityType
        }
    };
    var getObjResponse = entity.GetObjects(getObjRequest);
    var entityId = getObjResponse.Entity.Id;
    var entityType = getObjResponse.Entity.Type;
    var entityObjs = getObjResponse.Objects["testKey"];
}
handlers.GetObjects = GetObjects;
