////////////////////////////////////////////////////////////////////
//                          caap OBJECT
// this is the main object for the game, containing all methods, globals, etc.
/////////////////////////////////////////////////////////////////////

caap = {
    lastReload        : new Date(),
    waitingForDomLoad : false,
    newLevelUpMode    : false,
    pageLoadOK        : false,
    caapDivObject     : null,
    caapTopObject     : null,

    init: function () {
        try {
            gm.deleteValue("statsMatch");
            gm.deleteValue(this.friendListType.gifta.name + 'Requested');
            gm.deleteValue(this.friendListType.giftb.name + 'Requested');
            gm.deleteValue(this.friendListType.giftc.name + 'Requested');
            gm.deleteValue(this.friendListType.facebook.name + 'Requested');
            // Get rid of those ads now! :P
            if (gm.getValue('HideAds', false)) {
                $('.UIStandardFrame_SidebarAds').css('display', 'none');
            }

            // Can create a blank space above the game to host the dashboard if wanted.
            // Dashboard currently uses '185px'
            var shiftDown = gm.getValue('ShiftDown', '');
            if (shiftDown) {
                $(this.controlXY.selector).css('padding-top', shiftDown);
            }

            schedule.Load();
            this.LoadMonsters();
            this.LoadDemi();
            this.LoadRecon();
            this.LoadTown();
            this.AddControl();
            this.AddColorWheels();
            this.AddDashboard();
            this.AddListeners();
            this.AddDBListener();
            this.CheckResults();
            return true;
        } catch (err) {
            global.error("ERROR in init: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          UTILITY FUNCTIONS
    // Small functions called a lot to reduce duplicate code
    /////////////////////////////////////////////////////////////////////

    VisitUrl: function (url, loadWaitTime) {
        try {
            this.waitMilliSecs = (loadWaitTime) ? loadWaitTime : 5000;
            window.location.href = url;
            return true;
        } catch (err) {
            global.error("ERROR in VisitUrl: " + err);
            return false;
        }
    },

    Click: function (obj, loadWaitTime) {
        try {
            if (!obj) {
                throw 'Null object passed to Click';
            }

            if (this.waitingForDomLoad === false) {
                this.JustDidIt('clickedOnSomething');
                this.waitingForDomLoad = true;
            }

            this.waitMilliSecs = (loadWaitTime) ? loadWaitTime : 5000;
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            /*
            Return Value: boolean
            The return value of dispatchEvent indicates whether any of the listeners
            which handled the event called preventDefault. If preventDefault was called
            the value is false, else the value is true.
            */
            return !obj.dispatchEvent(evt);
        } catch (err) {
            global.error("ERROR in Click: " + err);
            return undefined;
        }
    },

    ClickAjax: function (link, loadWaitTime) {
        try {
            if (!link) {
                throw 'No link passed to Click Ajax';
            }

            if (gm.getValue('clickUrl', '').indexOf(link) < 0) {
                gm.setValue('clickUrl', 'http://apps.facebook.com/castle_age/' + link);
                this.waitingForDomLoad = false;
            }

            return this.VisitUrl("javascript:void(a46755028429_ajaxLinkSend('globalContainer', '" + link + "'))", loadWaitTime);
        } catch (err) {
            global.error("ERROR in ClickAjax: " + err);
            return false;
        }
    },

    oneMinuteUpdate: function (funcName) {
        try {
            if (!gm.getValue('reset' + funcName) && !schedule.Check(funcName + 'Timer')) {
                return false;
            }

            schedule.Set(funcName + 'Timer', 60);
            gm.setValue('reset' + funcName, false);
            return true;
        } catch (err) {
            global.error("ERROR in oneMinuteUpdate: " + err);
            return false;
        }
    },

    NavigateTo: function (pathToPage, imageOnPage) {
        try {
            var content   = document.getElementById('content'),
                pathList  = [],
                s         = 0,
                a         = null,
                imageTest = '',
                input     = null,
                img       = null;

            if (!content) {
                global.log(1, 'No content to Navigate to', imageOnPage, pathToPage);
                return false;
            }

            if (imageOnPage && this.CheckForImage(imageOnPage)) {
                return false;
            }

            pathList = pathToPage.split(",");
            for (s = pathList.length - 1; s >= 0; s -= 1) {
                a = nHtml.FindByAttrXPath(content, 'a', "contains(@href,'/" + pathList[s] + ".php') and not(contains(@href,'" + pathList[s] + ".php?'))");
                if (a) {
                    global.log(1, 'Go to', pathList[s]);
                    gm.setValue('clickUrl', 'http://apps.facebook.com/castle_age/' + pathList[s] + '.php');
                    this.Click(a);
                    return true;
                }

                imageTest = pathList[s];
                if (imageTest.indexOf(".") === -1) {
                    imageTest = imageTest + '.';
                }

                input = nHtml.FindByAttrContains(document.body, "input", "src", imageTest);
                if (input) {
                    global.log(2, 'Click on image', input.src.match(/[\w.]+$/));
                    this.Click(input);
                    return true;
                }

                img = nHtml.FindByAttrContains(document.body, "img", "src", imageTest);
                if (img) {
                    global.log(2, 'Click on image', img.src.match(/[\w.]+$/));
                    this.Click(img);
                    return true;
                }
            }

            global.log(1, 'Unable to Navigate to', imageOnPage, pathToPage);
            return false;
        } catch (err) {
            global.error("ERROR in NavigateTo: " + err, imageOnPage, pathToPage);
            return false;
        }
    },

    CheckForImage: function (image, webSlice, subDocument, nodeNum) {
        try {
            var traverse   = '',
                imageSlice = null;

            if (!webSlice) {
                if (!subDocument) {
                    webSlice = document.body;
                } else {
                    webSlice = subDocument.body;
                }
            }

            if (nodeNum) {
                traverse = ":eq(" + nodeNum + ")";
            } else {
                traverse = ":first";
            }

            imageSlice = $(webSlice).find("input[src*='" + image + "']" + traverse);
            if (!imageSlice.length) {
                imageSlice = $(webSlice).find("img[src*='" + image + "']" + traverse);
                if (!imageSlice.length) {
                    imageSlice = $(webSlice).find("div[style*='" + image + "']" + traverse);
                }
            }

            return (imageSlice.length ? imageSlice.get(0) : null);
        } catch (err) {
            global.error("ERROR in CheckForImage: " + err);
            return null;
        }
    },

    WhileSinceDidIt: function (nameOrNumber, seconds) {
        try {
            if (!/\d+/.test(nameOrNumber)) {
                nameOrNumber = gm.getValue(nameOrNumber, 0);
            }

            var now = new Date().getTime();
            return (parseInt(nameOrNumber, 10) < (now - 1000 * seconds));
        } catch (err) {
            global.error("ERROR in WhileSinceDidIt: " + err);
            return false;
        }
    },

    JustDidIt: function (name) {
        try {
            if (!name) {
                throw "name not provided!";
            }

            var now = (new Date().getTime());
            gm.setValue(name, now.toString());
            return true;
        } catch (err) {
            global.error("ERROR in JustDidIt: " + err);
            return false;
        }
    },

    NumberOnly: function (num) {
        try {
            var numOnly = parseFloat(num.toString().replace(new RegExp("[^0-9\\.]", "g"), ''));
            global.log(10, "NumberOnly", numOnly);
            return numOnly;
        } catch (err) {
            global.error("ERROR in NumberOnly: " + err);
            return null;
        }
    },

    RemoveHtmlJunk: function (html) {
        try {
            return html.replace(new RegExp("\\&[^;]+;", "g"), '');
        } catch (err) {
            global.error("ERROR in RemoveHtmlJunk: " + err);
            return null;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          DISPLAY FUNCTIONS
    // these functions set up the control applet and allow it to be changed
    /////////////////////////////////////////////////////////////////////

    defaultDropDownOption: "<option disabled='disabled' value='not selected'>Choose one</option>",

    MakeDropDown: function (idName, dropDownList, instructions, formatParms) {
        try {
            var selectedItem = gm.getValue(idName, 'defaultValue'),
                count        = 0,
                itemcount    = 0,
                htmlCode     = '',
                item         = 0;

            if (selectedItem === 'defaultValue') {
                selectedItem = gm.setValue(idName, dropDownList[0]);
            }

            for (itemcount in dropDownList) {
                if (dropDownList.hasOwnProperty(itemcount)) {
                    if (selectedItem === dropDownList[itemcount]) {
                        break;
                    }

                    count += 1;
                }
            }

            htmlCode = "<select id='caap_" + idName + "' " + ((instructions[count]) ? " title='" + instructions[count] + "' " : '') + formatParms + ">";
            htmlCode += this.defaultDropDownOption;
            for (item in dropDownList) {
                if (dropDownList.hasOwnProperty(item)) {
                    if (instructions) {
                        htmlCode += "<option value='" + dropDownList[item] +
                            "'" + ((selectedItem === dropDownList[item]) ? " selected='selected'" : '') +
                            ((instructions[item]) ? " title='" + instructions[item] + "'" : '') + ">" +
                            dropDownList[item] + "</option>";
                    } else {
                        htmlCode += "<option value='" + dropDownList[item] +
                            "'" + ((selectedItem === dropDownList[item]) ? " selected='selected'" : '') + ">" +
                            dropDownList[item] + "</option>";
                    }
                }
            }

            htmlCode += '</select>';
            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeDropDown: " + err);
            return '';
        }
    },

    /*-------------------------------------------------------------------------------------\
    DBDropDown is used to make our drop down boxes for dash board controls.  These require
    slightly different HTML from the side controls.
    \-------------------------------------------------------------------------------------*/
    DBDropDown: function (idName, dropDownList, instructions, formatParms) {
        try {
            var selectedItem = gm.getValue(idName, 'defaultValue'),
                htmlCode     = '',
                item         = 0;
            if (selectedItem === 'defaultValue') {
                selectedItem = gm.setValue(idName, dropDownList[0]);
            }

            htmlCode = " <select id='caap_" + idName + "' " + formatParms + "'><option>" + selectedItem;
            for (item in dropDownList) {
                if (dropDownList.hasOwnProperty(item)) {
                    if (selectedItem !== dropDownList[item]) {
                        if (instructions) {
                            htmlCode += "<option value='" + dropDownList[item] + "' " + ((instructions[item]) ? " title='" + instructions[item] + "'" : '') + ">"  + dropDownList[item];
                        } else {
                            htmlCode += "<option value='" + dropDownList[item] + "'>" + dropDownList[item];
                        }
                    }
                }
            }

            htmlCode += '</select>';
            return htmlCode;
        } catch (err) {
            global.error("ERROR in DBDropDown: " + err);
            return '';
        }
    },

    MakeCheckBox: function (idName, defaultValue, varClass, instructions, tableTF) {
        try {
            var checkItem = gm.getValue(idName, 'defaultValue'),
                htmlCode  = '';

            if (checkItem === 'defaultValue') {
                gm.setValue(idName, defaultValue);
            }

            htmlCode = "<input type='checkbox' id='caap_" + idName + "' title=" + '"' + instructions + '"' + ((varClass) ? " class='" + varClass + "'" : '') + (gm.getValue(idName) ? 'checked' : '') + ' />';
            if (varClass) {
                if (tableTF) {
                    htmlCode += "</td></tr></table>";
                } else {
                    htmlCode += '<br />';
                }

                htmlCode += this.AddCollapsingDiv(idName, varClass);
            }

            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeCheckBox: " + err);
            return '';
        }
    },

    MakeNumberForm: function (idName, instructions, initDefault, formatParms) {
        try {
            if (!initDefault) {
                initDefault = '';
            }

            if (gm.getValue(idName, 'defaultValue') === 'defaultValue') {
                gm.setValue(idName, initDefault);
            }

            if (!formatParms) {
                formatParms = "size='4'";
            }

            var htmlCode = " <input type='text' id='caap_" + idName + "' " + formatParms + " title=" + '"' + instructions + '" ' + "value='" + gm.getValue(idName, '') + "' />";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeNumberForm: " + err);
            return '';
        }
    },

    MakeCheckTR: function (text, idName, defaultValue, varClass, instructions, tableTF) {
        try {
            var htmlCode = "<tr><td style='width: 90%'>" + text +
                "</td><td style='width: 10%; text-align: right'>" +
                this.MakeCheckBox(idName, defaultValue, varClass, instructions, tableTF);

            if (!tableTF) {
                htmlCode += "</td></tr>";
            }

            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeCheckTR: " + err);
            return '';
        }
    },

    AddCollapsingDiv: function (parentId, subId) {
        try {
            var htmlCode = "<div id='caap_" + subId + "' style='display: " +
                (gm.getValue(parentId, false) ? 'block' : 'none') + "'>";

            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddCollapsingDiv: " + err);
            return '';
        }
    },

    ToggleControl: function (controlId, staticText) {
        try {
            var currentDisplay = gm.getValue('Control_' + controlId, "none"),
                displayChar    = "-",
                toggleCode     = '';

            if (currentDisplay === "none") {
                displayChar = "+";
            }

            toggleCode = '<b><a id="caap_Switch_' + controlId +
                '" href="javascript:;" style="text-decoration: none;"> ' +
                displayChar + ' ' + staticText + '</a></b><br />' +
                "<div id='caap_" + controlId + "' style='display: " + currentDisplay + "'>";

            return toggleCode;
        } catch (err) {
            global.error("ERROR in ToggleControl: " + err);
            return '';
        }
    },

    MakeTextBox: function (idName, instructions, formatParms) {
        try {
            if (formatParms === '') {
                if (global.is_chrome) {
                    formatParms = " rows='3' cols='25'";
                } else {
                    formatParms = " rows='3' cols='21'";
                }
            }

            var htmlCode = "<textarea title=" + '"' + instructions + '"' + " type='text' id='caap_" + idName + "' " + formatParms + ">" + gm.getValue(idName, '') + "</textarea>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeTextBox: " + err);
            return '';
        }
    },

    MakeListBox: function (idName, instructions, formatParms) {
        try {
            if (formatParms === '') {
                if (global.is_chrome) {
                    formatParms = " rows='3' cols='25'";
                } else {
                    formatParms = " rows='3' cols='21'";
                }
            }

            var htmlCode = "<textarea title=" + '"' + instructions + '"' + " type='text' id='caap_" + idName + "' " + formatParms + ">" + gm.getList(idName) + "</textarea>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in MakeTextBox: " + err);
            return '';
        }
    },

    SaveBoxText: function (idName) {
        try {
            var boxText = $("#caap_" + idName).val();
            if (typeof boxText !== 'string') {
                throw "Value of the textarea id='caap_" + idName + "' is not a string: " + boxText;
            }

            gm.setValue(idName, boxText);
            return true;
        } catch (err) {
            global.error("ERROR in SaveBoxText: " + err);
            return false;
        }
    },

    SetDivContent: function (idName, mess) {
        try {
            if (gm.getValue('SetTitle', false) && gm.getValue('SetTitleAction', false) && idName === "activity_mess") {
                var DocumentTitle = mess.replace("Activity: ", '') + " - ";

                if (gm.getValue('SetTitleName', false)) {
                    DocumentTitle += this.stats.PlayerName + " - ";
                }

                document.title = DocumentTitle + global.documentTitle;
            }

            $('#caap_' + idName).html(mess);
        } catch (err) {
            global.error("ERROR in SetDivContent: " + err);
        }
    },

    questWhenList: [
        'Energy Available',
        'At Max Energy',
        'At X Energy',
        'Not Fortifying',
        'Never'
    ],

    questWhenInst: [
        'Energy Available - will quest whenever you have enough energy.',
        'At Max Energy - will quest when energy is at max and will burn down all energy when able to level up.',
        'At X Energy - allows you to set maximum and minimum energy values to start and stop questing. Will burn down all energy when able to level up.',
        'Not Fortifying - will quest only when your fortify settings are matched.',
        'Never - disables questing.'
    ],

    questAreaList: [
        'Quest',
        'Demi Quests',
        'Atlantis'
    ],

    landQuestList: [
        'Land of Fire',
        'Land of Earth',
        'Land of Mist',
        'Land of Water',
        'Demon Realm',
        'Undead Realm',
        'Underworld',
        'Kingdom of Heaven',
        'Ivory City'
    ],

    demiQuestList: [
        'Ambrosia',
        'Malekus',
        'Corvintheus',
        'Aurora',
        'Azeron'
    ],

    atlantisQuestList: [
        'Atlantis'
    ],

    questForList: [
        'Advancement',
        'Max Influence',
        'Max Gold',
        'Max Experience',
        'Manual'
    ],

    SelectDropOption: function (idName, value) {
        try {
            $("#caap_" + idName + " option").removeAttr('selected');
            $("#caap_" + idName + " option[value='" + value + "']").attr('selected', 'selected');
            return true;
        } catch (err) {
            global.error("ERROR in SelectDropOption: " + err);
            return false;
        }
    },

    ShowAutoQuest: function () {
        try {
            $("#stopAutoQuest").text("Stop auto quest: " + gm.getObjVal('AutoQuest', 'name') + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
            $("#stopAutoQuest").css('display', 'block');
            return true;
        } catch (err) {
            global.error("ERROR in ShowAutoQuest: " + err);
            return false;
        }
    },

    ClearAutoQuest: function () {
        try {
            $("#stopAutoQuest").text("");
            $("#stopAutoQuest").css('display', 'none');
            return true;
        } catch (err) {
            global.error("ERROR in ClearAutoQuest: " + err);
            return false;
        }
    },

    ManualAutoQuest: function () {
        try {
            this.SelectDropOption('WhyQuest', 'Manual');
            this.ClearAutoQuest();
            return true;
        } catch (err) {
            global.error("ERROR in ManualAutoQuest: " + err);
            return false;
        }
    },

    ChangeDropDownList: function (idName, dropList, option) {
        try {
            $("#caap_" + idName + " option").remove();
            $("#caap_" + idName).append(this.defaultDropDownOption);
            for (var item in dropList) {
                if (dropList.hasOwnProperty(item)) {
                    if (item === '0' && !option) {
                        gm.setValue(idName, dropList[item]);
                        global.log(1, "Saved: " + idName + "  Value: " + dropList[item]);
                    }

                    $("#caap_" + idName).append("<option value='" + dropList[item] + "'>" + dropList[item] + "</option>");
                }
            }

            if (option) {
                $("#caap_" + idName + " option[value='" + option + "']").attr('selected', 'selected');
            } else {
                $("#caap_" + idName + " option:eq(1)").attr('selected', 'selected');
            }

            return true;
        } catch (err) {
            global.error("ERROR in ChangeDropDownList: " + err);
            return false;
        }
    },

    divList: [
        'banner',
        'activity_mess',
        'idle_mess',
        'quest_mess',
        'battle_mess',
        'monster_mess',
        'fortify_mess',
        'heal_mess',
        'demipoint_mess',
        'demibless_mess',
        'level_mess',
        'exp_mess',
        'debug1_mess',
        'debug2_mess',
        'control'
    ],

    controlXY: {
        selector : '.UIStandardFrame_Content',
        x        : 0,
        y        : 0
    },

    GetControlXY: function (reset) {
        try {
            var newTop  = 0,
                newLeft = 0;

            if (reset) {
                newTop = $(this.controlXY.selector).offset().top;
            } else {
                newTop = this.controlXY.y;
            }

            if (this.controlXY.x === '' || reset) {
                newLeft = $(this.controlXY.selector).offset().left + $(this.controlXY.selector).width() + 10;
            } else {
                newLeft = $(this.controlXY.selector).offset().left + this.controlXY.x;
            }

            return {x: newLeft, y: newTop};
        } catch (err) {
            global.error("ERROR in GetControlXY: " + err);
            return {x: 0, y: 0};
        }
    },

    SaveControlXY: function () {
        try {
            var refOffset = $(this.controlXY.selector).offset();
            gm.setValue('caap_div_menuTop', caap.caapDivObject.offset().top);
            gm.setValue('caap_div_menuLeft', caap.caapDivObject.offset().left - refOffset.left);
            gm.setValue('caap_top_zIndex', '1');
            gm.setValue('caap_div_zIndex', '2');
        } catch (err) {
            global.error("ERROR in SaveControlXY: " + err);
        }
    },

    dashboardXY: {
        selector : '#app46755028429_app_body_container',
        x        : 0,
        y        : 0
    },

    GetDashboardXY: function (reset) {
        try {
            var newTop  = 0,
                newLeft = 0;

            if (reset) {
                newTop = $(this.dashboardXY.selector).offset().top - 10;
            } else {
                newTop = this.dashboardXY.y;
            }

            if (this.dashboardXY.x === '' || reset) {
                newLeft = $(this.dashboardXY.selector).offset().left;
            } else {
                newLeft = $(this.dashboardXY.selector).offset().left + this.dashboardXY.x;
            }

            return {x: newLeft, y: newTop};
        } catch (err) {
            global.error("ERROR in GetDashboardXY: " + err);
            return {x: 0, y: 0};
        }
    },

    SaveDashboardXY: function () {
        try {
            var refOffset = $(this.dashboardXY.selector).offset();
            gm.setValue('caap_top_menuTop', this.caapTopObject.offset().top);
            gm.setValue('caap_top_menuLeft', this.caapTopObject.offset().left - refOffset.left);
            gm.setValue('caap_div_zIndex', '1');
            gm.setValue('caap_top_zIndex', '2');
        } catch (err) {
            global.error("ERROR in SaveDashboardXY: " + err);
        }
    },

    AddControl: function () {
        try {
            var caapDiv = "<div id='caap_div'>",
                divID = 0,
                styleXY = {
                    x: 0,
                    y: 0
                },
                htmlCode = '',
                banner = '';

            for (divID in this.divList) {
                if (this.divList.hasOwnProperty(divID)) {
                    caapDiv += "<div id='caap_" + this.divList[divID] + "'></div>";
                }
            }

            caapDiv += "</div>";
            this.controlXY.x = gm.getValue('caap_div_menuLeft', '');
            this.controlXY.y = gm.getValue('caap_div_menuTop', $(this.controlXY.selector).offset().top);
            styleXY = this.GetControlXY();
            $(caapDiv).css({
                width                   : '180px',
                background              : gm.getValue('StyleBackgroundLight', '#E0C691'),
                opacity                 : gm.getValue('StyleOpacityLight', '1'),
                color                   : '#000',
                padding                 : "4px",
                border                  : "2px solid #444",
                top                     : styleXY.y + 'px',
                left                    : styleXY.x + 'px',
                zIndex                  : gm.getValue('caap_div_zIndex', '2'),
                position                : 'absolute',
                '-moz-border-radius'    : '5px',
                '-webkit-border-radius' : '5px'
            }).appendTo(document.body);

            this.caapDivObject = $("#caap_div");

            banner += "<div id='caap_BannerHide' style='display: " + (gm.getValue('BannerDisplay', true) ? 'block' : 'none') + "'>";
            banner += "<img src='data:image/png;base64," + image64.header + "' alt='Castle Age Auto Player' /><br /><hr /></div>";
            this.SetDivContent('banner', banner);

            htmlCode += this.AddPauseMenu();
            htmlCode += this.AddDisableMenu();
            htmlCode += this.AddCashHealthMenu();
            htmlCode += this.AddQuestMenu();
            htmlCode += this.AddBattleMenu();
            htmlCode += this.AddMonsterMenu();
            htmlCode += this.AddReconMenu();
            htmlCode += this.AddGeneralsMenu();
            htmlCode += this.AddSkillPointsMenu();
            htmlCode += this.AddOtherOptionsMenu();
            htmlCode += this.AddFooterMenu();
            this.SetDivContent('control', htmlCode);

            this.CheckLastAction(gm.getValue('LastAction', 'none'));
            $("#caap_resetElite").button();
            $("#caap_StartedColourSelect").button();
            $("#caap_StopedColourSelect").button();
            $("#caap_FillArmy").button();
            $("#caap_ResetMenuLocation").button();
            return true;
        } catch (err) {
            global.error("ERROR in AddControl: " + err);
            return false;
        }
    },

    AddPauseMenu: function () {
        try {
            var htmlCode = '';
            if (global.is_chrome) {
                htmlCode += "<div id='caapPausedDiv' style='display: none'><a href='javascript:;' id='caapPauseA' >Pause</a></div>";
            }

            htmlCode += "<div id='caapPaused' style='display: " + gm.getValue('caapPause', 'block') + "'><b>Paused on mouse click.</b><br /><a href='javascript:;' id='caapRestart' >Click here to restart</a></div><hr />";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddPauseMenu: " + err);
            return '';
        }
    },

    AddDisableMenu: function () {
        try {
            var autoRunInstructions = "Disable auto running of CAAP. Stays persistent even on page reload and the autoplayer will not autoplay.",
                htmlCode = '';

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Disable Autoplayer", 'Disabled', false, '', autoRunInstructions) + '</table><hr />';
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddDisableMenu: " + err);
            return '';
        }
    },

    AddCashHealthMenu: function () {
        try {
            var bankInstructions0 = "Minimum cash to keep in the bank. Press tab to save",
                bankInstructions1 = "Minimum cash to have on hand, press tab to save",
                bankInstructions2 = "Maximum cash to have on hand, bank anything above this, press tab to save (leave blank to disable).",
                healthInstructions = "Minimum health to have before healing, press tab to save (leave blank to disable).",
                healthStamInstructions = "Minimum Stamina to have before healing, press tab to save (leave blank to disable).",
                bankImmedInstructions = "Bank as soon as possible. May interrupt player and monster battles.",
                autobuyInstructions = "Automatically buy lands in groups of 10 based on best Return On Investment value.",
                autosellInstructions = "Automatically sell off any excess lands above your level allowance.",
                htmlCode = '';

            htmlCode += this.ToggleControl('CashandHealth', 'CASH and HEALTH');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Bank Immediately", 'BankImmed', false, '', bankImmedInstructions);
            htmlCode += this.MakeCheckTR("Auto Buy Lands", 'autoBuyLand', false, '', autobuyInstructions);
            htmlCode += this.MakeCheckTR("Auto Sell Excess Lands", 'SellLands', false, '', autosellInstructions) + '</table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Keep In Bank</td><td style='text-align: right'>$" + this.MakeNumberForm('minInStore', bankInstructions0, 100000, "type='text' size='12' style='font-size: 10px; text-align: right'") + "</td></tr></table>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Bank Above</td><td style='text-align: right'>$" + this.MakeNumberForm('MaxInCash', bankInstructions2, '', "type='text' size='7' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += "<tr><td style='padding-left: 10px'>But Keep On Hand</td><td style='text-align: right'>$" +
                this.MakeNumberForm('MinInCash', bankInstructions1, '', "type='text' size='7' style='font-size: 10px; text-align: right'") + "</td></tr></table>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Heal If Health Below</td><td style='text-align: right'>" + this.MakeNumberForm('MinToHeal', healthInstructions, 10, "size='2' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += "<tr><td style='padding-left: 10px'>But Not If Stamina Below</td><td style='text-align: right'>" +
                this.MakeNumberForm('MinStamToHeal', healthStamInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddCashHealthMenu: " + err);
            return '';
        }
    },

    AddQuestMenu: function () {
        try {
            var forceSubGen = "Always do a quest with the Subquest General you selected under the Generals section. NOTE: This will keep the script from automatically switching to the required general for experience of primary quests.",
                XQuestInstructions = "Start questing when energy is at or above this value.",
                XMinQuestInstructions = "Stop quest when energy is at or below this value.",
                autoQuestName = gm.getObjVal('AutoQuest', 'name'),
                htmlCode = '';

            htmlCode += this.ToggleControl('Quests', 'QUEST');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td width=80>Quest When</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('WhenQuest', this.questWhenList, this.questWhenInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenQuestHide' style='display: " + (gm.getValue('WhenQuest', false) !== 'Never' ? 'block' : 'none') + "'>";
            htmlCode += "<div id='caap_WhenQuestXEnergy' style='display: " + (gm.getValue('WhenQuest', false) !== 'At X Energy' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Start At Or Above Energy</td><td style='text-align: right'>" + this.MakeNumberForm('XQuestEnergy', XQuestInstructions, 1, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Stop At Or Below Energy</td><td style='text-align: right'>" +
                this.MakeNumberForm('XMinQuestEnergy', XMinQuestInstructions, 0, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Quest Area</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('QuestArea', this.questAreaList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
            switch (gm.getValue('QuestArea', this.questAreaList[0])) {
            case 'Quest' :
                htmlCode += "<tr id='trQuestSubArea' style='display: table-row'><td>Sub Area</td><td style='text-align: right; width: 60%'>" +
                    this.MakeDropDown('QuestSubArea', this.landQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            case 'Demi Quests' :
                htmlCode += "<tr id='trQuestSubArea' style='display: table-row'><td>Sub Area</td><td style='text-align: right; width: 60%'>" +
                    this.MakeDropDown('QuestSubArea', this.demiQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            default :
                htmlCode += "<tr id='trQuestSubArea' style='display: table-row'><td>Sub Area</td><td style='text-align: right; width: 60%'>" +
                    this.MakeDropDown('QuestSubArea', this.atlantisQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            }

            htmlCode += "<tr><td>Quest For</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('WhyQuest', this.questForList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Switch Quest Area", 'switchQuestArea', false, '', 'Allows switching quest area after Advancement or Max Influence');
            htmlCode += this.MakeCheckTR("Use Only Subquest General", 'ForceSubGeneral', false, '', forceSubGen);
            htmlCode += this.MakeCheckTR("Quest For Orbs", 'GetOrbs', false, '', 'Perform the Boss quest in the selected land for orbs you do not have.') + "</table>";
            htmlCode += "</div>";
            if (autoQuestName) {
                htmlCode += "<a id='stopAutoQuest' style='display: block' href='javascript:;'>Stop auto quest: " + autoQuestName + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")" + "</a>";
            } else {
                htmlCode += "<a id='stopAutoQuest' style='display: none' href='javascript:;'></a>";
            }

            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddQuestMenu: " + err);
            return '';
        }
    },

    AddBattleMenu: function () {
        try {
            var XBattleInstructions = "Start battling if stamina is above this points",
                XMinBattleInstructions = "Don't battle if stamina is below this points",
                userIdInstructions = "User IDs(not user name).  Click with the " +
                    "right mouse button on the link to the users profile & copy link." +
                    "  Then paste it here and remove everything but the last numbers." +
                    " (ie. 123456789)",
                chainBPInstructions = "Number of battle points won to initiate a " +
                    "chain attack. Specify 0 to always chain attack.",
                chainGoldInstructions = "Amount of gold won to initiate a chain " +
                    "attack. Specify 0 to always chain attack.",
                FMRankInstructions = "The lowest relative rank below yours that " +
                    "you are willing to spend your stamina on. Leave blank to attack " +
                    "any rank.",
                FMARBaseInstructions = "This value sets the base for your army " +
                    "ratio calculation. It is basically a multiplier for the army " +
                    "size of a player at your equal level. A value of 1 means you " +
                    "will battle an opponent the same level as you with an army the " +
                    "same size as you or less. Default .5",
                plusonekillsInstructions = "Force +1 kill scenario if 80% or more" +
                    " of targets are withn freshmeat settings. Note: Since Castle Age" +
                    " choses the target, selecting this option could result in a " +
                    "greater chance of loss.",
                raidOrderInstructions = "List of search words that decide which " +
                    "raids to participate in first.  Use words in player name or in " +
                    "raid name. To specify max damage follow keyword with :max token " +
                    "and specifiy max damage values. Use 'k' and 'm' suffixes for " +
                    "thousand and million.",
                ignorebattlelossInstructions = "Ignore battle losses and attack " +
                    "regardless.  This will also delete all battle loss records.",
                battleList = [
                    'Stamina Available',
                    'At Max Stamina',
                    'At X Stamina',
                    'No Monster',
                    'Stay Hidden',
                    'Never'
                ],
                battleInst = [
                    'Stamina Available will battle whenever you have enough stamina',
                    'At Max Stamina will battle when stamina is at max and will burn down all stamina when able to level up',
                    'At X Stamina you can set maximum and minimum stamina to battle',
                    'No Monster will battle only when there are no active monster battles',
                    'Stay Hidden uses stamina to try to keep you under 10 health so you cannot be attacked, while also attempting to maximize your stamina use for Monster attacks. YOU MUST SET MONSTER TO "STAY HIDDEN" TO USE THIS FEATURE.',
                    'Never - disables player battles'
                ],
                typeList = [
                    'Invade',
                    'Duel',
                    'War'
                ],
                typeInst = [
                    'Battle using Invade button',
                    'Battle using Duel button - no guarentee you will win though',
                    'War using Duel button - no guarentee you will win though'
                ],
                targetList = [
                    'Freshmeat',
                    'Userid List',
                    'Raid'
                ],
                targetInst = [
                    'Use settings to select a target from the Battle Page',
                    'Select target from the supplied list of userids',
                    'Raid Battles'
                ],
                dosiegeInstructions = "(EXPERIMENTAL) Turns on or off automatic siege assist for all raids only.",
                collectRewardInstructions = "(EXPERIMENTAL) Automatically collect raid rewards.",
                htmlCode = '';

            htmlCode += this.ToggleControl('Battling', 'BATTLE');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle When</td><td style='text-align: right; width: 65%'>" + this.MakeDropDown('WhenBattle', battleList, battleInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenBattleStayHidden1' style='display: " + (gm.getValue('WhenBattle', false) === 'Stay Hidden' && gm.getValue('WhenMonster', false) !== 'Stay Hidden' ? 'block' : 'none') + "'>";
            htmlCode += "<font color='red'><b>Warning: Monster Not Set To 'Stay Hidden'</b></font>";
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenBattleXStamina' style='display: " + (gm.getValue('WhenBattle', false) !== 'At X Stamina' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Start Battles When Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XBattleStamina', XBattleInstructions, 1, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep This Stamina</td><td style='text-align: right'>" +
                this.MakeNumberForm('XMinBattleStamina', XMinBattleInstructions, 0, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenBattleHide' style='display: " + (gm.getValue('WhenBattle', false) !== 'Never' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle Type</td><td style='text-align: right; width: 40%'>" + this.MakeDropDown('BattleType', typeList, typeInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Siege Weapon Assist Raids", 'raidDoSiege', true, '', dosiegeInstructions);
            htmlCode += this.MakeCheckTR("Collect Raid Rewards", 'raidCollectReward', false, '', collectRewardInstructions);
            htmlCode += this.MakeCheckTR("Clear Complete Raids", 'clearCompleteRaids', false, '', '');
            htmlCode += this.MakeCheckTR("Ignore Battle Losses", 'IgnoreBattleLoss', false, '', ignorebattlelossInstructions);
            htmlCode += "<tr><td>Chain:Battle Points Won</td><td style='text-align: right'>" + this.MakeNumberForm('ChainBP', chainBPInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td>Chain:Gold Won</td><td style='text-align: right'>" + this.MakeNumberForm('ChainGold', chainGoldInstructions, '', "size='5' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Target Type</td><td style='text-align: right; width: 50%'>" + this.MakeDropDown('TargetType', targetList, targetInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_FreshmeatSub' style='display: " + (gm.getValue('TargetType', false) !== 'Userid List' ? 'block' : 'none') + "'>";
            htmlCode += "Attack targets that are:";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Not Lower Than Rank Minus</td><td style='text-align: right'>" +
                this.MakeNumberForm('FreshMeatMinRank', FMRankInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than X*Army</td><td style='text-align: right'>" +
                this.MakeNumberForm('FreshMeatARBase', FMARBaseInstructions, "0.5", "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_RaidSub' style='display: " + (gm.getValue('TargetType', false) === 'Raid' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Attempt +1 Kills", 'PlusOneKills', false, '', plusonekillsInstructions) + '</table>';
            htmlCode += "Join Raids in this order <a href='http://senses.ws/caap/index.php?topic=1502.0' target='_blank'><font color='red'>?</font></a><br />";
            htmlCode += this.MakeTextBox('orderraid', raidOrderInstructions, '');
            htmlCode += "</div>";
            htmlCode += "<div align=right id='caap_UserIdsSub' style='display: " + (gm.getValue('TargetType', false) === 'Userid List' ? 'block' : 'none') + "'>";
            htmlCode += this.MakeListBox('BattleTargets', userIdInstructions, '');
            htmlCode += "</div>";
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddBattleMenu: " + err);
            return '';
        }
    },

    AddMonsterMenu: function () {
        try {
            var XMonsterInstructions = "Start attacking if stamina is above this points",
                XMinMonsterInstructions = "Don't attack if stamina is below this points",
                attackOrderInstructions = "List of search words that decide which monster to attack first. " +
                    "Use words in player name or in monster name. To specify max damage follow keyword with " +
                    ":max token and specifiy max damage values. Use 'k' and 'm' suffixes for thousand and million. " +
                    "To override achievement use the ach: token and specify damage values.",
                fortifyInstructions = "Fortify if ship health is below this % (leave blank to disable)",
                questFortifyInstructions = "Do Quests if ship health is above this % and quest mode is set to Not Fortify (leave blank to disable)",
                stopAttackInstructions = "Don't attack if ship health is below this % (leave blank to disable)",
                monsterachieveInstructions = "Check if monsters have reached achievement damage level first. Switch when achievement met.",
                demiPointsFirstInstructions = "Don't attack monsters until you've gotten all your demi points from battling. Requires that battle mode is set appropriately",
                powerattackInstructions = "Use power attacks. Only do normal attacks if power attack not possible",
                powerattackMaxInstructions = "Use maximum power attacks globally on Skaar, Genesis, Ragnarok, and Bahamut types. Only do normal power attacks if maximum power attack not possible",
                powerfortifyMaxInstructions = "Use maximum power fortify globally on Skaar, Genesis, Ragnarok, and Bahamut types. Only do normal power attacks if maximum power attack not possible",
                dosiegeInstructions = "Turns on or off automatic siege assist for all monsters only.",
                useTacticsInstructions = "Use the Tactics attack method, on monsters that support it, instead of the normal attack.",
                useTacticsThresholdInstructions = "If monster health falls below this percentage then use the regular attack buttons instead of tactics.",
                collectRewardInstructions = "Automatically collect monster rewards.",
                mbattleList = [
                    'Stamina Available',
                    'At Max Stamina',
                    'At X Stamina',
                    'Stay Hidden',
                    'Never'
                ],
                mbattleInst = [
                    'Stamina Available will attack whenever you have enough stamina',
                    'At Max Stamina will attack when stamina is at max and will burn down all stamina when able to level up',
                    'At X Stamina you can set maximum and minimum stamina to battle',
                    'Stay Hidden uses stamina to try to keep you under 10 health so you cannot be attacked, while also attempting to maximize your stamina use for Monster attacks. YOU MUST SET BATTLE WHEN TO "STAY HIDDEN" TO USE THIS FEATURE.',
                    'Never - disables attacking monsters'
                ],
                monsterDelayInstructions = "Max random delay (in seconds) to battle monsters",
                demiPoint = [
                    'Ambrosia',
                    'Malekus',
                    'Corvintheus',
                    'Aurora',
                    'Azeron'
                ],
                demiPtList = [
                    '<img src="http://image2.castleagegame.com/graphics/symbol_tiny_1.jpg" height="15" width="14"/>',
                    '<img src="http://image2.castleagegame.com/graphics/symbol_tiny_2.jpg" height="15" width="14"/>',
                    '<img src="http://image2.castleagegame.com/graphics/symbol_tiny_3.jpg" height="15" width="14"/>',
                    '<img src="http://image2.castleagegame.com/graphics/symbol_tiny_4.jpg" height="15" width="14"/>',
                    '<img src="http://image2.castleagegame.com/graphics/symbol_tiny_5.jpg" height="15" width="14"/>'
                ],
                demiPtItem = 0,
                htmlCode = '';

            htmlCode += this.ToggleControl('Monster', 'MONSTER');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 35%'>Attack When</td><td style='text-align: right'>" + this.MakeDropDown('WhenMonster', mbattleList, mbattleInst, "style='font-size: 10px; width: 100%;'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenMonsterXStamina' style='display: " + (gm.getValue('WhenMonster', false) !== 'At X Stamina' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle When Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XMonsterStamina', XMonsterInstructions, 1, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep This Stamina</td><td style='text-align: right'>" +
                this.MakeNumberForm('XMinMonsterStamina', XMinMonsterInstructions, 0, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenMonsterHide' style='display: " + (gm.getValue('WhenMonster', false) !== 'Never' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Monster delay secs</td><td style='text-align: right'>" + this.MakeNumberForm('seedTime', monsterDelayInstructions, 300, "type='text' size='3' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += this.MakeCheckTR("Use Tactics", 'UseTactics', false, 'UseTactics_Adv', useTacticsInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>&nbsp;&nbsp;&nbsp;Health threshold</td><td style='text-align: right'>" +
                this.MakeNumberForm('TacticsThreshold', useTacticsThresholdInstructions, 75, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Power Attack Only", 'PowerAttack', true, 'PowerAttack_Adv', powerattackInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("&nbsp;&nbsp;&nbsp;Power Attack Max", 'PowerAttackMax', false, '', powerattackMaxInstructions) + "</table>";
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Power Fortify Max", 'PowerFortifyMax', false, '', powerfortifyMaxInstructions);
            htmlCode += this.MakeCheckTR("Siege Weapon Assist Monsters", 'monsterDoSiege', true, '', dosiegeInstructions);
            htmlCode += this.MakeCheckTR("Collect Monster Rewards", 'monsterCollectReward', false, '', collectRewardInstructions);
            htmlCode += this.MakeCheckTR("Clear Complete Monsters", 'clearCompleteMonsters', false, '', '');
            htmlCode += this.MakeCheckTR("Achievement Mode", 'AchievementMode', true, '', monsterachieveInstructions);
            htmlCode += this.MakeCheckTR("Get Demi Points First", 'DemiPointsFirst', false, 'DemiList', demiPointsFirstInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            for (demiPtItem in demiPtList) {
                if (demiPtList.hasOwnProperty(demiPtItem)) {
                    htmlCode += demiPtList[demiPtItem] + this.MakeCheckBox('DemiPoint' + demiPtItem, true, '', demiPoint[demiPtItem]);
                }
            }

            htmlCode += "</table>";
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Fortify If Percentage Under</td><td style='text-align: right'>" +
                this.MakeNumberForm('MaxToFortify', fortifyInstructions, 50, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Quest If Percentage Over</td><td style='text-align: right'>" +
                this.MakeNumberForm('MaxHealthtoQuest', questFortifyInstructions, 60, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td>No Attack If Percentage Under</td><td style='text-align: right'>" + this.MakeNumberForm('MinFortToAttack', stopAttackInstructions, 10, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "Attack Monsters in this order <a href='http://senses.ws/caap/index.php?topic=1502.0' target='_blank'><font color='red'>?</font></a><br />";
            htmlCode += this.MakeTextBox('orderbattle_monster', attackOrderInstructions, '');
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddMonsterMenu: " + err);
            return '';
        }
    },

    AddReconMenu: function () {
        try {
            // Recon Controls
            var PReconInstructions = "Enable player battle reconnaissance to run " +
                    "as an idle background task. Battle targets will be collected and" +
                    " can be displayed using the 'Target List' selection on the " +
                    "dashboard.",
                PRRankInstructions = "Provide the number of ranks below you which" +
                    " recon will use to filter targets. This value will be subtracted" +
                    " from your rank to establish the minimum rank that recon will " +
                    "consider as a viable target. Default 3.",
                PRLevelInstructions = "Provide the number of levels above you " +
                    "which recon will use to filter targets. This value will be added" +
                    " to your level to establish the maximum level that recon will " +
                    "consider as a viable target. Default 10.",
                PRARBaseInstructions = "This value sets the base for your army " +
                    "ratio calculation. It is basically a multiplier for the army " +
                    "size of a player at your equal level. For example, a value of " +
                    ".5 means you will battle an opponent the same level as you with " +
                    "an army half the size of your army or less. Default 1.",
                htmlCode = '';

            htmlCode += this.ToggleControl('Recon', 'RECON');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Enable Player Recon", 'DoPlayerRecon', false, 'PlayerReconControl', PReconInstructions, true);
            htmlCode += 'Find battle targets that are:';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Not Lower Than Rank Minus</td><td style='text-align: right'>" +
                this.MakeNumberForm('ReconPlayerRank', PRRankInstructions, '3', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than Level Plus</td><td style='text-align: right'>" +
                this.MakeNumberForm('ReconPlayerLevel', PRLevelInstructions, '10', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than X*Army</td><td style='text-align: right'>" +
                this.MakeNumberForm('ReconPlayerARBase', PRARBaseInstructions, '1', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddReconMenu: " + err);
            return '';
        }
    },

    AddGeneralsMenu: function () {
        try {
            // Add General Comboboxes
            var reverseGenInstructions = "This will make the script level Generals under level 4 from Top-down instead of Bottom-up",
                ignoreGeneralImage = "This will prevent the script " +
                    "from changing your selected General to 'Use Current' if the script " +
                    "is unable to find the General's image when changing activities. " +
                    "Instead it will use the current General for the activity and try " +
                    "to select the correct General again next time.",
                LevelUpGenExpInstructions = "Specify the number of experience " +
                    "points below the next level up to begin using the level up general.",
                LevelUpGenInstructions1 = "Use the Level Up General for Idle mode.",
                LevelUpGenInstructions2 = "Use the Level Up General for Monster mode.",
                LevelUpGenInstructions3 = "Use the Level Up General for Fortify mode.",
                LevelUpGenInstructions4 = "Use the Level Up General for Battle mode.",
                LevelUpGenInstructions5 = "Use the Level Up General for doing sub-quests.",
                LevelUpGenInstructions6 = "Use the Level Up General for doing primary quests " +
                    "(Warning: May cause you not to gain influence if wrong general is equipped.)",
                dropDownItem = 0,
                htmlCode = '';

            general.BuildlLists();

            htmlCode += this.ToggleControl('Generals', 'GENERALS');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Do not reset General", 'ignoreGeneralImage', false, '', ignoreGeneralImage) + "</table>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            for (dropDownItem in general.StandardList) {
                if (general.StandardList.hasOwnProperty(dropDownItem)) {
                    htmlCode += '<tr><td>' + general.StandardList[dropDownItem] + "</td><td style='text-align: right'>" +
                        this.MakeDropDown(general.StandardList[dropDownItem] + 'General', general.List, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
                }
            }

            htmlCode += "<tr><td>Buy</td><td style='text-align: right'>" + this.MakeDropDown('BuyGeneral', general.BuyList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Collect</td><td style='text-align: right'>" + this.MakeDropDown('CollectGeneral', general.CollectList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Income</td><td style='text-align: right'>" + this.MakeDropDown('IncomeGeneral', general.IncomeList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Banking</td><td style='text-align: right'>" + this.MakeDropDown('BankingGeneral', general.BankingList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Level Up</td><td style='text-align: right'>" + this.MakeDropDown('LevelUpGeneral', general.List, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr></table>';
            htmlCode += "<div id='caap_LevelUpGeneralHide' style='display: " + (gm.getValue('LevelUpGeneral', false) !== 'Use Current' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Exp To Use LevelUp Gen </td><td style='text-align: right'>" + this.MakeNumberForm('LevelUpGeneralExp', LevelUpGenExpInstructions, 20, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += this.MakeCheckTR("Level Up Gen For Idle", 'IdleLevelUpGeneral', true, '', LevelUpGenInstructions1);
            htmlCode += this.MakeCheckTR("Level Up Gen For Monsters", 'MonsterLevelUpGeneral', true, '', LevelUpGenInstructions2);
            htmlCode += this.MakeCheckTR("Level Up Gen For Fortify", 'FortifyLevelUpGeneral', true, '', LevelUpGenInstructions3);
            htmlCode += this.MakeCheckTR("Level Up Gen For Battles", 'BattleLevelUpGeneral', true, '', LevelUpGenInstructions4);
            htmlCode += this.MakeCheckTR("Level Up Gen For SubQuests", 'SubQuestLevelUpGeneral', true, '', LevelUpGenInstructions5);
            htmlCode += this.MakeCheckTR("Level Up Gen For MainQuests", 'QuestLevelUpGeneral', true, '', LevelUpGenInstructions6);
            htmlCode += "</table></div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Reverse Under Level 4 Order", 'ReverseLevelUpGenerals', false, '', reverseGenInstructions) + "</table>";
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddGeneralsMenu: " + err);
            return '';
        }
    },

    AddSkillPointsMenu: function () {
        try {
            var statusInstructions = "Automatically increase attributes when " +
                    "upgrade skill points are available.",
                statusAdvInstructions = "USE WITH CAUTION: You can use numbers or " +
                    "formulas(ie. level * 2 + 10). Variable keywords include energy, " +
                    "health, stamina, attack, defense, and level. JS functions can be " +
                    "used (Math.min, Math.max, etc) !!!Remember your math class: " +
                    "'level + 20' not equals 'level * 2 + 10'!!!",
                statImmedInstructions = "Update Stats Immediately",
                attrList = [
                    '',
                    'Energy',
                    'Attack',
                    'Defense',
                    'Stamina',
                    'Health'
                ],
                htmlCode = '';

            htmlCode += this.ToggleControl('Status', 'UPGRADE SKILL POINTS');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Auto Add Upgrade Points", 'AutoStat', false, 'AutoStat_Adv', statusInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Upgrade Immediately", 'StatImmed', false, '', statImmedInstructions);
            htmlCode += this.MakeCheckTR("Advanced Settings <a href='http://userscripts.org/posts/207279' target='_blank'><font color='red'>?</font></a>", 'AutoStatAdv', false, '', statusAdvInstructions) + "</table>";
            htmlCode += "<div id='caap_Status_Normal' style='display: " + (gm.getValue('AutoStatAdv', false) ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Increase</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute0', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" +
                this.MakeNumberForm('AttrValue0', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute1', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" +
                this.MakeNumberForm('AttrValue1', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute2', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" +
                this.MakeNumberForm('AttrValue2', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute3', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" +
                this.MakeNumberForm('AttrValue3', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute4', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" +
                this.MakeNumberForm('AttrValue4', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr></table>";
            htmlCode += "</div>";
            htmlCode += "<div id='caap_Status_Adv' style='display: " + (gm.getValue('AutoStatAdv', false) ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Increase</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute5', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%; text-align: left'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue5', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute6', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue6', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute7', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue7', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute8', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue8', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" +
                this.MakeDropDown('Attribute9', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue9', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr></table>";
            htmlCode += "</div>";
            htmlCode += "</table></div>";
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddSkillPointsMenu: " + err);
            return '';
        }
    },

    AddOtherOptionsMenu: function () {
        try {
            // Other controls
            var giftInstructions = "Automatically receive and send return gifts.",
                timeInstructions = "Use 24 hour format for displayed times.",
                titleInstructions0 = "Set the title bar.",
                titleInstructions1 = "Add the current action.",
                titleInstructions2 = "Add the player name.",
                autoCollectMAInstructions = "Auto collect your Master and Apprentice rewards.",
                hideAdsInstructions = "Hides the sidebar adverts.",
                newsSummaryInstructions = "Enable or disable the news summary on the index page.",
                autoAlchemyInstructions1 = "AutoAlchemy will combine all recipes " +
                    "that do not have missing ingredients. By default, it will not " +
                    "combine Battle Hearts recipes.",
                autoAlchemyInstructions2 = "If for some reason you do not want " +
                    "to skip Battle Hearts",
                autoPotionsInstructions0 = "Enable or disable the auto consumption " +
                    "of energy and stamina potions.",
                autoPotionsInstructions1 = "Number of stamina potions at which to " +
                    "begin consuming.",
                autoPotionsInstructions2 = "Number of stamina potions to keep.",
                autoPotionsInstructions3 = "Number of energy potions at which to " +
                    "begin consuming.",
                autoPotionsInstructions4 = "Number of energy potions to keep.",
                autoPotionsInstructions5 = "Do not consume potions if the " +
                    "experience points to the next level are within this value.",
                autoEliteInstructions = "Enable or disable Auto Elite function",
                autoEliteIgnoreInstructions = "Use this option if you have a small " +
                    "army and are unable to fill all 10 Elite positions. This prevents " +
                    "the script from checking for any empty places and will cause " +
                    "Auto Elite to run on its timer only.",
                bannerInstructions = "Uncheck if you wish to hide the CAAP banner.",
                giftChoiceList = [
                    'Same Gift As Received',
                    'Random Gift'
                ],
                autoBlessList = [
                    'None',
                    'Energy',
                    'Attack',
                    'Defense',
                    'Stamina',
                    'Health'
                ],
                styleList = [
                    'CA Skin',
                    'Original',
                    'Custom',
                    'None'
                ],
                htmlCode = '';

            giftChoiceList = giftChoiceList.concat(gm.getList('GiftList'));
            giftChoiceList.push('Get Gift List');

            htmlCode += this.ToggleControl('Other', 'OTHER OPTIONS');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Display CAAP Banner', 'BannerDisplay', true, '', bannerInstructions);
            htmlCode += this.MakeCheckTR('Use 24 Hour Format', 'use24hr', true, '', timeInstructions);
            htmlCode += this.MakeCheckTR('Set Title', 'SetTitle', false, 'SetTitle_Adv', titleInstructions0, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Display Action', 'SetTitleAction', false, '', titleInstructions1);
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Display Name', 'SetTitleName', false, '', titleInstructions2) + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Hide Sidebar Adverts', 'HideAds', false, '', hideAdsInstructions);
            htmlCode += this.MakeCheckTR('Enable News Summary', 'NewsSummary', true, '', newsSummaryInstructions);
            htmlCode += this.MakeCheckTR('Auto Collect MA', 'AutoCollectMA', true, '', autoCollectMAInstructions);
            htmlCode += this.MakeCheckTR('Auto Alchemy', 'AutoAlchemy', false, 'AutoAlchemy_Adv', autoAlchemyInstructions1, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Do Battle Hearts', 'AutoAlchemyHearts', false, '', autoAlchemyInstructions2) + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Potions', 'AutoPotions', false, 'AutoPotions_Adv', autoPotionsInstructions0, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Spend Stamina Potions At</td><td style='text-align: right'>" +
                this.MakeNumberForm('staminaPotionsSpendOver', autoPotionsInstructions1, 39, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep Stamina Potions</td><td style='text-align: right'>" +
                this.MakeNumberForm('staminaPotionsKeepUnder', autoPotionsInstructions2, 35, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Spend Energy Potions At</td><td style='text-align: right'>" +
                this.MakeNumberForm('energyPotionsSpendOver', autoPotionsInstructions3, 39, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep Energy Potions</td><td style='text-align: right'>" +
                this.MakeNumberForm('energyPotionsKeepUnder', autoPotionsInstructions4, 35, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Wait If Exp. To Level</td><td style='text-align: right'>" +
                this.MakeNumberForm('potionsExperience', autoPotionsInstructions5, 20, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Elite Army', 'AutoElite', true, 'AutoEliteControl', autoEliteInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Timed Only', 'AutoEliteIgnore', false, '', autoEliteIgnoreInstructions) + '</table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td><input type='button' id='caap_resetElite' value='Do Now' style='padding: 0; font-size: 10px; height: 18px' /></tr></td>";
            htmlCode += '<tr><td>' + this.MakeListBox('EliteArmyList', "Try these UserIDs first. Use ',' between each UserID", '') + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Return Gifts', 'AutoGift', false, 'GiftControl', giftInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; padding-left: 10px'>Give</td><td style='text-align: right'>" +
                this.MakeDropDown('GiftChoice', giftChoiceList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            htmlCode += "<tr><td style='width: 50%'>Auto bless</td><td style='text-align: right'>" +
                this.MakeDropDown('AutoBless', autoBlessList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            htmlCode += "<tr><td style='width: 50%'>Style</td><td style='text-align: right'>" +
                this.MakeDropDown('DisplayStyle', styleList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_DisplayStyleHide' style='display: " + (gm.getValue('DisplayStyle', false) === 'Custom' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'><b>Started</b></td><td style='text-align: right'><input type='button' id='caap_StartedColorSelect' value='Select' style='padding: 0; font-size: 10px; height: 18px' /></td></tr>";
            htmlCode += "<tr><td style='padding-left: 20px'>RGB Color</td><td style='text-align: right'>" +
                this.MakeNumberForm('StyleBackgroundLight', 'FFF or FFFFFF', '#E0C691', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 20px'>Transparency</td><td style='text-align: right'>" +
                this.MakeNumberForm('StyleOpacityLight', '0 ~ 1', '1', "type='text' size='5' style='vertical-align: middle; font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'><b>Stoped</b></td><td style='text-align: right'><input type='button' id='caap_StopedColorSelect' value='Select' style='padding: 0; font-size: 10px; height: 18px' /></td></tr>";
            htmlCode += "<tr><td style='padding-left: 20px'>RGB Color</td><td style='text-align: right'>" +
                this.MakeNumberForm('StyleBackgroundDark', 'FFF or FFFFFF', '#B09060', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 20px'>Transparency</td><td style='text-align: right'>" +
                this.MakeNumberForm('StyleOpacityDark', '0 ~ 1', '1', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            htmlCode += "<tr><td><input type='button' id='caap_FillArmy' value='Fill Army' style='padding: 0; font-size: 10px; height: 18px' /></td></tr></table>";
            htmlCode += '</div>';
            htmlCode += "<hr/></div>";
            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddOtherOptionsMenu: " + err);
            return '';
        }
    },

    AddFooterMenu: function () {
        try {
            var htmlCode = '';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 90%'>Unlock Menu <input type='button' id='caap_ResetMenuLocation' value='Reset' style='padding: 0; font-size: 10px; height: 18px' /></td>" +
                "<td style='width: 10%; text-align: right'><input type='checkbox' id='unlockMenu' /></td></tr></table>";
            if (!devVersion) {
                htmlCode += "Version: " + caapVersion + " - <a href='" + global.discussionURL + "' target='_blank'>CAAP Forum</a><br />";
                if (global.newVersionAvailable) {
                    htmlCode += "<a href='http://castle-age-auto-player.googlecode.com/files/Castle-Age-Autoplayer.user.js'>Install new CAAP version: " + gm.getValue('SUC_remote_version') + "!</a>";
                }
            } else {
                htmlCode += "Version: " + caapVersion + " d" + devVersion + " - <a href='" + global.discussionURL + "' target='_blank'>CAAP Forum</a><br />";
                if (global.newVersionAvailable) {
                    htmlCode += "<a href='http://castle-age-auto-player.googlecode.com/files/Castle-Age-Autoplayer.user.js'>Install new CAAP version: " + gm.getValue('SUC_remote_version') + " d" + gm.getValue('DEV_remote_version')  + "!</a>";
                }
            }

            return htmlCode;
        } catch (err) {
            global.error("ERROR in AddFooterMenu: " + err);
            return '';
        }
    },

    AddColorWheels: function () {
        try {
            var fb1call = null,
                fb2call = null;

            fb1call = function (color) {
                $('#caap_ColorSelectorDiv1').css({'background-color': color});
                $('#caap_StyleBackgroundLight').val(color);
                gm.setValue("StyleBackgroundLight", color);
                gm.setValue("CustStyleBackgroundLight", color);
            };

            $.farbtastic($("<div id='caap_ColorSelectorDiv1'></div>").css({
                background : gm.getValue("StyleBackgroundLight", "#E0C691"),
                padding    : "5px",
                border     : "2px solid #000",
                top        : (window.innerHeight / 2) - 100 + 'px',
                left       : (window.innerWidth / 2) - 290 + 'px',
                zIndex     : '1337',
                position   : 'fixed',
                display    : 'none'
            }).appendTo(document.body), fb1call).setColor(gm.getValue("StyleBackgroundLight", "#E0C691"));

            fb2call = function (color) {
                $('#caap_ColorSelectorDiv2').css({'background-color': color});
                $('#caap_StyleBackgroundDark').val(color);
                gm.setValue("StyleBackgroundDark", color);
                gm.setValue("CustStyleBackgroundDark", color);
            };

            $.farbtastic($("<div id='caap_ColorSelectorDiv2'></div>").css({
                background : gm.getValue("StyleBackgroundDark", "#B09060"),
                padding    : "5px",
                border     : "2px solid #000",
                top        : (window.innerHeight / 2) - 100 + 'px',
                left       : (window.innerWidth / 2) + 'px',
                zIndex     : '1337',
                position   : 'fixed',
                display    : 'none'
            }).appendTo(document.body), fb2call).setColor(gm.getValue("StyleBackgroundDark", "#B09060"));

            return true;
        } catch (err) {
            global.error("ERROR in AddColorWheels: " + err);
            return false;
        }
    },

    AddDashboard: function () {
        try {
            /*-------------------------------------------------------------------------------------\
             Here is where we construct the HTML for our dashboard. We start by building the outer
             container and position it within the main container.
            \-------------------------------------------------------------------------------------*/
            var layout      = "<div id='caap_top'>",
                displayList = ['Monster', 'Target List', 'User Stats', 'Generals Stats', 'Soldier Stats', 'Item Stats', 'Magic Stats'],
                styleXY = {
                    x: 0,
                    y: 0
                };
            /*-------------------------------------------------------------------------------------\
             Next we put in our Refresh Monster List button which will only show when we have
             selected the Monster display.
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonMonster' style='position:absolute;top:0px;left:250px;display:" +
                (gm.getValue('DBDisplay', 'Monster') === 'Monster' ? 'block' : 'none') + "'><input type='button' id='caap_refreshMonsters' value='Refresh Monster List' style='padding: 0; font-size: 9px; height: 18px' /></div>";
            /*-------------------------------------------------------------------------------------\
             Next we put in the Clear Target List button which will only show when we have
             selected the Target List display
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonTargets' style='position:absolute;top:0px;left:250px;display:" +
                (gm.getValue('DBDisplay', 'Monster') === 'Target List' ? 'block' : 'none') + "'><input type='button' id='caap_clearTargets' value='Clear Targets List' style='padding: 0; font-size: 9px; height: 18px' /></div>";
            /*-------------------------------------------------------------------------------------\
             Then we put in the Live Feed link since we overlay the Castle Age link.
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonFeed' style='position:absolute;top:0px;left:0px;'><input id='caap_liveFeed' type='button' value='LIVE FEED! Your friends are calling.' style='padding: 0; font-size: 9px; height: 18px' /></div>";
            /*-------------------------------------------------------------------------------------\
             We install the display selection box that allows the user to toggle through the
             available displays.
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_DBDisplay' style='font-size: 9px;position:absolute;top:0px;right:5px;'>Display: " +
                this.DBDropDown('DBDisplay', displayList, '', "style='font-size: 9px; min-width: 120px; max-width: 120px; width : 120px;'") + "</div>";
            /*-------------------------------------------------------------------------------------\
            And here we build our empty content divs.  We display the appropriate div
            depending on which display was selected using the control above
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_infoMonster' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Monster' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_infoTargets1' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Target List' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_infoTargets2' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Target Stats' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_userStats' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'User Stats' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_generalsStats' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Generals Stats' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_soldiersStats' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Soldier Stats' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_itemStats' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Item Stats' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_magicStats' style='position:relative;top:15px;width:610px;height:165px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') === 'Magic Stats' ? 'block' : 'none') + "'></div>";
            layout += "</div>";
            /*-------------------------------------------------------------------------------------\
             No we apply our CSS to our container
            \-------------------------------------------------------------------------------------*/
            this.dashboardXY.x = gm.getValue('caap_top_menuLeft', '');
            this.dashboardXY.y = gm.getValue('caap_top_menuTop', $(this.dashboardXY.selector).offset().top - 10);
            styleXY = this.GetDashboardXY();
            $(layout).css({
                background              : gm.getValue("StyleBackgroundLight", "white"),
                padding                 : "5px",
                height                  : "185px",
                width                   : "610px",
                margin                  : "0 auto",
                opacity                 : gm.getValue('StyleOpacityLight', '1'),
                top                     : styleXY.y + 'px',
                left                    : styleXY.x + 'px',
                zIndex                  : gm.getValue('caap_top_zIndex', '1'),
                position                : 'absolute',
                '-moz-border-radius'    : '5px',
                '-webkit-border-radius' : '5px'
            }).appendTo(document.body);

            this.caapTopObject = $('#caap_top');
            $("#caap_refreshMonsters").button();
            $("#caap_clearTargets").button();
            $("#caap_liveFeed").button();

            return true;
        } catch (err) {
            global.error("ERROR in AddDashboard: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                      MONSTERS DASHBOARD
    // Display the current monsters and stats
    /////////////////////////////////////////////////////////////////////
    decHours2HoursMin : function (decHours) {
        global.log(9, "decHours2HoursMin", decHours);
        var hours   = 0,
            minutes = 0;

        hours = Math.floor(decHours);
        minutes = parseInt((decHours - hours) * 60, 10);
        if (minutes < 10) {
            minutes = '0' + minutes;
        }

        return (hours + ':' + minutes);
    },

    makeCommaValue: function (nStr) {
        nStr += '';
        var x   = nStr.split('.'),
            x1  = x[0],
            rgx = /(\d+)(\d{3})/;

        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }

        return x1;
    },

    makeTh: function (obj) {
        var header = {text: '', color: '', id: '', title: '', width: ''},
        html       = '<th';

        header = obj;
        if (!header.color) {
            header.color = 'black';
        }

        if (header.id) {
            html += " id='" + header.id + "'";
        }

        if (header.title) {
            html += " title='" + header.title + "'";
        }

        if (header.width) {
            html += " width='" + header.width + "'";
        }

        html += " style='color:" + header.color + ";font-size:10px;font-weight:bold'>" + header.text + "</th>";
        return html;
    },

    makeTd: function (obj) {
        var data = {text: '', color: '', id: '',  title: ''},
            html = '<td';

        data = obj;
        if (gm.getObjVal(data.color, 'color')) {
            data.color = gm.getObjVal(data.color, 'color');
        }

        if (!data.color) {
            data.color = 'black';
        }

        if (data.id) {
            html += " id='" + data.id + "'";
        }

        if (data.title) {
            html += " title='" + data.title + "'";
        }

        html += " style='color:" + data.color + ";font-size:10px'>" + data.text + "</td>";
        return html;
    },

    UpdateDashboardWaitLog: true,

    UpdateDashboard: function (force) {
        try {
            var html                     = '',
                monsterList              = [],
                monster                  = '',
                monstType                = '',
                energyRequire            = 0,
                nodeNum                  = 0,
                staLvl                   = [],
                color                    = '',
                value                    = 0,
                headers                  = [],
                values                   = [],
                generalValues            = [],
                townValues               = [],
                town                     = [],
                pp                       = 0,
                i                        = 0,
                newTime                  = new Date(),
                count                    = 0,
                monsterObjLink           = '',
                visitMonsterLink         = '',
                visitMonsterInstructions = '',
                removeLink               = '',
                removeLinkInstructions   = '',
                shortMonths              = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                userIdLink               = '',
                userIdLinkInstructions   = '',
                id                       = '',
                title                    = '',
                monsterConditions        = '',
                achLevel                 = 0,
                maxDamage                = 0,
                titleCol                 = 'black',
                valueCol                 = 'red',
                it                       = 0,
                str                      = '',
                header                   = {text: '', color: '', id: '', title: '', width: ''},
                data                     = {text: '', color: '', id: '', title: ''},
                width                    = '';

            if ($('#caap_top').length === 0) {
                throw "We are missing the Dashboard div!";
            }

            if (!force && !this.oneMinuteUpdate('dashboard') && $('#caap_infoMonster').html() && $('#caap_infoMonster').html()) {
                if (this.UpdateDashboardWaitLog) {
                    global.log(3, "Dashboard update is waiting on oneMinuteUpdate");
                    this.UpdateDashboardWaitLog = false;
                }

                return false;
            }

            global.log(9, "Updating Dashboard");
            this.UpdateDashboardWaitLog = true;
            html = "<table width='100%' cellpadding='0px' cellspacing='0px'><tr>";
            headers = ['Name', 'Damage', 'Damage%', 'Fort%', 'Stre%', 'TimeLeft', 'T2K', 'Phase', 'Link', '&nbsp;', '&nbsp;'];
            values  = ['name', 'damage', 'life', 'fortify', 'strength', 'timeLeft', 't2k', 'phase', 'link'];
            for (pp in headers) {
                if (headers.hasOwnProperty(pp)) {
                    width = '';
                    if (headers[pp] === 'Name') {
                        width = '30%';
                    }

                    html += this.makeTh({text: headers[pp], color: '', id: '', title: '', width: width});
                }
            }

            html += '</tr>';
            values.shift();
            global.log(9, "monsterList", monsterList);
            this.monsterArray.forEach(function (monsterObj) {
                global.log(9, "monsterObj", monsterObj);
                monster = monsterObj.name;
                monstType = monsterObj.type;
                energyRequire = 10;
                nodeNum = 0;
                if (caap.monsterInfo[monstType]) {
                    staLvl = caap.monsterInfo[monstType].staLvl;
                    if (!caap.InLevelUpMode() && gm.getValue('PowerFortifyMax') && staLvl) {
                        for (nodeNum = caap.monsterInfo[monstType].staLvl.length - 1; nodeNum >= 0; nodeNum -= 1) {
                            if (caap.stats.stamina.max > caap.monsterInfo[monstType].staLvl[nodeNum]) {
                                break;
                            }
                        }
                    }

                    if (nodeNum >= 0 && nodeNum !== null && nodeNum !== undefined && gm.getValue('PowerAttackMax') && caap.monsterInfo[monstType].nrgMax) {
                        energyRequire = caap.monsterInfo[monstType].nrgMax[nodeNum];
                    }
                }

                global.log(9, "Energy Required/Node", energyRequire, nodeNum);
                color = '';
                html += "<tr>";
                //if (monster === gm.getValue('targetFromfortify') && caap.CheckEnergy(energyRequire, gm.getValue('WhenFortify', 'Energy Available'), 'fortify_mess')) {
                if (monster === gm.getValue('targetFromfortify')) {
                    color = 'blue';
                } else if (monster === gm.getValue('targetFromraid') || monster === gm.getValue('targetFrombattle_monster')) {
                    color = 'green';
                } else {
                    color = monsterObj.color;
                }

                achLevel = 0;
                maxDamage = 0;
                monsterConditions = monsterObj.conditions;
                if (monsterConditions) {
                    achLevel = caap.parseCondition('ach', monsterConditions);
                    maxDamage = caap.parseCondition('max', monsterConditions);
                }

                monsterObjLink = monsterObj.link;
                global.log(9, "monsterObjLink", monsterObjLink);
                if (monsterObjLink) {
                    visitMonsterLink = monsterObjLink.replace("&action=doObjective", "").match(new RegExp("'(http:.+)'"));
                    global.log(9, "visitMonsterLink", visitMonsterLink);
                    visitMonsterInstructions = "Clicking this link will take you to " + monster;
                    data = {
                        text  : '<span id="caap_monster_' + count + '" title="' + visitMonsterInstructions + '" mname="' + monster + '" rlink="' + visitMonsterLink[1] +
                                '" onmouseover="this.style.cursor=\'pointer\';" onmouseout="this.style.cursor=\'default\';">' + monster + '</span>',
                        color : color,
                        id    : '',
                        title : ''
                    };

                    html += caap.makeTd(data);
                } else {
                    html += caap.makeTd({text: monster, color: color, id: '', title: ''});
                }

                values.forEach(function (displayItem) {
                    global.log(9, 'displayItem/value ', displayItem, monsterObj[displayItem]);
                    id = "caap_" + displayItem + "_" + count;
                    title = '';
                    if (displayItem === 'phase' && color === 'grey') {
                        html += caap.makeTd({text: monsterObj.status, color: color, id: '', title: ''});
                    } else {
                        value = monsterObj[displayItem];
                        if ((value !== '' && value >= 0) || (value !== '' && isNaN(value))) {
                            if (parseInt(value, 10) === value && value > 999) {
                                global.log(9, 'makeCommaValue ', value);
                                value = caap.makeCommaValue(value);
                            }

                            switch (displayItem) {
                            case 'damage' :
                                if (achLevel) {
                                    title = "User Set Monster Achievement: " + caap.makeCommaValue(achLevel);
                                } else if (gm.getValue('AchievementMode', false)) {
                                    if (caap.monsterInfo[monstType]) {
                                        title = "Default Monster Achievement: " + caap.makeCommaValue(caap.monsterInfo[monstType].ach);
                                    }
                                } else {
                                    title = "Achievement Mode Disabled";
                                }

                                if (maxDamage) {
                                    title += " - User Set Max Damage: " + caap.makeCommaValue(maxDamage);
                                }

                                break;
                            case 'timeLeft' :
                                if (caap.monsterInfo[monstType]) {
                                    title = "Total Monster Duration: " + caap.monsterInfo[monstType].duration + " hours";
                                }

                                break;
                            case 't2k' :
                                value = caap.decHours2HoursMin(value);
                                title = "Estimated Time To Kill: " + value + " hours:mins";
                                break;
                            case 'life' :
                                value = value.toFixed(2);
                                title = "Percentage of monster life remaining: " + value + "%";
                                break;
                            case 'fortify' :
                                value = value.toFixed(2);
                                title = "Percentage of party health/monster defense: " + value + "%";
                                break;
                            case 'strength' :
                                value = value.toFixed(2);
                                title = "Percentage of party strength: " + value + "%";
                                break;
                            default :
                            }

                            html += caap.makeTd({text: value, color: color, id: id, title: title});
                        } else {
                            html += caap.makeTd({text: '', color: color, id: '', title: ''});
                        }
                    }
                });

                if (monsterConditions && monsterConditions !== 'none') {
                    data = {
                        text  : '<span title="User Set Conditions: ' + monsterConditions + '" class="ui-icon ui-icon-info">i</span>',
                        color : 'blue',
                        id    : '',
                        title : ''
                    };

                    html += caap.makeTd(data);
                } else {
                    html += caap.makeTd({text: '', color: color, id: '', title: ''});
                }

                if (monsterObjLink) {
                    removeLink = monsterObjLink.replace("casuser", "remove_list").replace("&action=doObjective", "").match(new RegExp("'(http:.+)'"));
                    global.log(9, "removeLink", removeLink);
                    removeLinkInstructions = "Clicking this link will remove " + monster + " from both CA and CAAP!";
                    data = {
                        text  : '<span id="caap_remove_' + count + '" title="' + removeLinkInstructions + '" mname="' + monster + '" rlink="' + removeLink[1] +
                                '" onmouseover="this.style.cursor=\'pointer\';" onmouseout="this.style.cursor=\'default\';" class="ui-icon ui-icon-circle-close">X</span>',
                        color : 'blue',
                        id    : '',
                        title : ''
                    };

                    html += caap.makeTd(data);
                } else {
                    html += caap.makeTd({text: '', color: color, id: '', title: ''});
                }

                html += '</tr>';
                count += 1;
            });

            html += '</table>';
            $("#caap_infoMonster").html(html);

            $("#caap_top span[id*='caap_monster_']").click(function (e) {
                global.log(9, "Clicked", e.target.id);
                var visitMonsterLink = {
                    mname     : '',
                    rlink     : '',
                    arlink    : ''
                },
                i = 0;

                for (i = 0; i < e.target.attributes.length; i += 1) {
                    if (e.target.attributes[i].nodeName === 'mname') {
                        visitMonsterLink.mname = e.target.attributes[i].nodeValue;
                    } else if (e.target.attributes[i].nodeName === 'rlink') {
                        visitMonsterLink.rlink = e.target.attributes[i].nodeValue;
                        visitMonsterLink.arlink = visitMonsterLink.rlink.replace("http://apps.facebook.com/castle_age/", "");
                    }
                }

                global.log(9, 'visitMonsterLink', visitMonsterLink);
                caap.ClickAjax(visitMonsterLink.arlink);
            });

            $("#caap_top span[id*='caap_remove_']").click(function (e) {
                global.log(9, "Clicked", e.target.id);
                var monsterRemove = {
                    mname     : '',
                    rlink     : '',
                    arlink    : ''
                },
                i = 0,
                resp = false;

                for (i = 0; i < e.target.attributes.length; i += 1) {
                    if (e.target.attributes[i].nodeName === 'mname') {
                        monsterRemove.mname = e.target.attributes[i].nodeValue;
                    } else if (e.target.attributes[i].nodeName === 'rlink') {
                        monsterRemove.rlink = e.target.attributes[i].nodeValue;
                        monsterRemove.arlink = monsterRemove.rlink.replace("http://apps.facebook.com/castle_age/", "");
                    }
                }

                global.log(9, 'monsterRemove', monsterRemove);
                resp = confirm("Are you sure you want to remove " + monsterRemove.mname + "?");
                if (resp === true) {
                    caap.delMonsterRecord(monsterRemove.mname);
                    caap.UpdateDashboard(true);
                    if (gm.getValue('clickUrl', '').indexOf(monsterRemove.arlink) < 0) {
                        gm.setValue('clickUrl', monsterRemove.rlink);
                        this.waitingForDomLoad = false;
                    }

                    caap.VisitUrl("javascript:void(a46755028429_get_cached_ajax('" + monsterRemove.arlink + "', 'get_body'))");
                }
            });

            /*-------------------------------------------------------------------------------------\
            Next we build the HTML to be included into the 'caap_infoTargets1' div. We set our
            table and then build the header row.
            \-------------------------------------------------------------------------------------*/
            html = "<table width='100%' cellpadding='0px' cellspacing='0px'><tr>";
            headers = ['UserId', 'Name',    'Deity#',   'Rank',    'Rank#',   'Level',    'Army',    'Last Alive'];
            values  = ['userID', 'nameStr', 'deityNum', 'rankStr', 'rankNum', 'levelNum', 'armyNum', 'aliveTime'];
            for (pp in headers) {
                if (headers.hasOwnProperty(pp)) {
                    html += this.makeTh({text: headers[pp], color: '', id: '', title: '', width: ''});
                }
            }

            html += '</tr>';
            for (i = 0; i < this.ReconRecordArray.length; i += 1) {
                html += "<tr>";
                for (pp in values) {
                    if (values.hasOwnProperty(pp)) {
                        if (/userID/.test(values[pp])) {
                            userIdLinkInstructions = "Clicking this link will take you to the user keep of " + this.ReconRecordArray[i][values[pp]];
                            userIdLink = "http://apps.facebook.com/castle_age/keep.php?casuser=" + this.ReconRecordArray[i][values[pp]];
                            data = {
                                text  : '<span id="caap_target_' + i + '" title="' + userIdLinkInstructions + '" rlink="' + userIdLink +
                                        '" onmouseover="this.style.cursor=\'pointer\';" onmouseout="this.style.cursor=\'default\';">' + this.ReconRecordArray[i][values[pp]] + '</span>',
                                color : 'blue',
                                id    : '',
                                title : ''
                            };

                            html += caap.makeTd(data);
                        } else if (/\S+Num/.test(values[pp])) {
                            html += caap.makeTd({text: this.ReconRecordArray[i][values[pp]], color: 'black', id: '', title: ''});
                        } else if (/\S+Time/.test(values[pp])) {
                            newTime = new Date(this.ReconRecordArray[i][values[pp]]);
                            data = {
                                text  : newTime.getDate() + '-' + shortMonths[newTime.getMonth()] + ' ' + newTime.getHours() + ':' + (newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes(),
                                color : 'black',
                                id    : '',
                                title : ''
                            };

                            html += caap.makeTd(data);
                        } else {
                            html += caap.makeTd({text: this.ReconRecordArray[i][values[pp]], color: 'black', id: '', title: ''});
                        }
                    }
                }

                html += '</tr>';
            }

            html += '</table>';
            $("#caap_infoTargets1").html(html);

            $("#caap_top span[id*='caap_target_']").click(function (e) {
                global.log(9, "Clicked", e.target.id);
                var visitUserIdLink = {
                    rlink     : '',
                    arlink    : ''
                },
                i = 0;

                for (i = 0; i < e.target.attributes.length; i += 1) {
                    if (e.target.attributes[i].nodeName === 'rlink') {
                        visitUserIdLink.rlink = e.target.attributes[i].nodeValue;
                        visitUserIdLink.arlink = visitUserIdLink.rlink.replace("http://apps.facebook.com/castle_age/", "");
                    }
                }

                global.log(9, 'visitUserIdLink', visitUserIdLink);
                caap.ClickAjax(visitUserIdLink.arlink);
            });

            /*-------------------------------------------------------------------------------------\
            Next we build the HTML to be included into the 'caap_userStats' div. We set our
            table and then build the header row.
            \-------------------------------------------------------------------------------------*/
            html = "<table width='100%' cellpadding='0px' cellspacing='0px'><tr>";
            headers = ['Name', 'Value', 'Name', 'Value'];
            for (pp in headers) {
                if (headers.hasOwnProperty(pp)) {
                    html += this.makeTh({text: headers[pp], color: '', id: '', title: '', width: ''});
                }
            }

            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Facebook ID', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.FBID, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Account Name', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.account, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Character Name', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.PlayerName, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Energy', color: titleCol, id: '', title: 'Current/Max'});
            html += this.makeTd({text: this.stats.energy.num + '/' + this.stats.energy.max, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Level', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.level, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Stamina', color: titleCol, id: '', title: 'Current/Max'});
            html += this.makeTd({text: this.stats.stamina.num + '/' + this.stats.stamina.max, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Battle Rank', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.battleRankTable[this.stats.rank.battle] + ' (' + this.stats.rank.battle + ')', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Attack', color: titleCol, id: '', title: 'Current/Max'});
            html += this.makeTd({text: this.makeCommaValue(this.stats.attack), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Battle Rank Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.rank.battlePoints), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Defense', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.defense), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'War Rank', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.warRankTable[this.stats.rank.war] + ' (' + this.stats.rank.war + ')', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Health', color: titleCol, id: '', title: 'Current/Max'});
            html += this.makeTd({text: this.stats.health.num + '/' + this.stats.health.max, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'War Rank Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.rank.warPoints), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Army', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.army.actual), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Generals', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.generals.total, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Generals When Invade', color: titleCol, id: '', title: 'For every 5 army members you have, one of your generals will also join the fight.'});
            html += this.makeTd({text: this.stats.generals.invade, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Gold In Bank', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.bank), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Total Income Per Hour', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.income), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Gold In Cash', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.cash), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Upkeep', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.upkeep), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Total Gold', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.total), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Cash Flow Per Hour', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '$' + this.makeCommaValue(this.stats.gold.flow), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Skill Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.points.skill, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Energy Potions', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.potions.energy, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Favor Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.points.favor, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Stamina Potions', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.potions.stamina, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Experience To Next Level (ETNL)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.exp.dif), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Battle Strength Index (BSI)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.bsi.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Hours To Level (HTL)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.decHours2HoursMin(this.stats.indicators.htl), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Levelling Speed Index (LSI)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.lsi.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Hours Remaining To Level (HRTL)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.decHours2HoursMin(this.stats.indicators.hrtl), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Skill Points Per Level (SPPL)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.sppl.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Expected Next Level (ENL)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: schedule.FormatTime(new Date(this.stats.indicators.enl)), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Attack Power Index (API)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.api.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Defense Power Index (DPI)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.dpi.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Mean Power Index (MPI)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.indicators.mpi.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Battles/Wars Won', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.other.bww), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Times eliminated', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.other.te), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Battles/Wars Lost', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.other.bwl), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Times you eliminated an enemy', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.other.tee), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Battles/Wars Win/Loss Ratio (WLR)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.other.wlr.toFixed(2), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Enemy Eliminated/Eliminated Ratio (EER)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.other.eer.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Invasions Won', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.invasions.won), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Duels Won', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.duels.won), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Invasions Lost', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.invasions.lost), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Duels Lost', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.duels.lost), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Invasions Streak', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.invasions.streak), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Duels Streak', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.battle.duels.streak), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Invasions Win/loss Ratio (IWLR)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.achievements.battle.invasions.ratio.toFixed(2), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Duels Win/loss Ratio (DWLR)', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.stats.achievements.battle.duels.ratio.toFixed(2), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Quests Completed', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.other.qc), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Alchemy Performed', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.other.alchemy), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Sieges Assisted With', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.sieges), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Gildamesh, The Orc King Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.gildamesh), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Lotus Ravenmoore Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.lotus), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'The Colossus of Terra Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.colossus), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Dragons Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.dragons), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Sylvanas the Sorceress Queen Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.sylvanas), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Cronus, The World Hydra Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.cronus), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Keira the Dread Knight Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.keira), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'The Battle of the Dark Legion Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.legion), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Genesis, The Earth Elemental Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.genesis), color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Skaar Deathrune Slain', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.makeCommaValue(this.stats.achievements.monster.skaar), color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Ambrosia Daily Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.ambrosia.daily.num + '/' + this.demi.ambrosia.daily.max, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Malekus Daily Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.malekus.daily.num + '/' + this.demi.ambrosia.daily.max, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Ambrosia Total Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.ambrosia.power.total, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Malekus Total Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.malekus.power.total, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Corvintheus Daily Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.corvintheus.daily.num + '/' + this.demi.corvintheus.daily.max, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Aurora Daily Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.aurora.daily.num + '/' + this.demi.aurora.daily.max, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Corvintheus Total Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.corvintheus.power.total, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: 'Aurora Total Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.aurora.power.total, color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Azeron Daily Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.azeron.daily.num + '/' + this.demi.azeron.daily.max, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            html += "<tr>";
            html += this.makeTd({text: 'Azeron Total Points', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: this.demi.azeron.power.total, color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';


            html += "<tr>";
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: titleCol, id: '', title: ''});
            html += this.makeTd({text: '&nbsp;', color: valueCol, id: '', title: ''});
            html += '</tr>';

            count = 0;
            for (pp in this.stats.character) {
                if(this.stats.character.hasOwnProperty(pp)) {
                    if (count % 2  === 0) {
                        html += "<tr>";
                    }

                    html += this.makeTd({text: this.stats.character[pp].name, color: titleCol, id: '', title: ''});
                    html += this.makeTd({text: "Level " + this.stats.character[pp].level + " (" + this.stats.character[pp].percent + "%)", color: valueCol, id: '', title: ''});
                    if (count % 2 === 1) {
                        html += '</tr>';
                    }

                    count += 1;
                }
            }

            html += '</table>';
            $("#caap_userStats").html(html);

            /*-------------------------------------------------------------------------------------\
            Next we build the HTML to be included into the 'caap_generalsStats' div. We set our
            table and then build the header row.
            \-------------------------------------------------------------------------------------*/
            html = "<table width='100%' cellpadding='0px' cellspacing='0px'><tr>";
            headers = ['General', 'Lvl', 'Atk', 'Def', 'API', 'DPI', 'MPI', 'EAtk', 'EDef', 'EAPI', 'EDPI', 'EMPI', 'Special'];
            values  = ['name', 'lvl', 'atk', 'def', 'api', 'dpi', 'mpi', 'eatk', 'edef', 'eapi', 'edpi', 'empi', 'special'];
            $.merge(generalValues, values);
            for (pp in headers) {
                if (headers.hasOwnProperty(pp)) {
                    header = {
                        text  : '<span id="caap_generalsStats_' + values[pp] + '" title="Click to sort" onmouseover="this.style.cursor=\'pointer\';" onmouseout="this.style.cursor=\'default\';">' + headers[pp] + '</span>',
                        color : 'blue',
                        id    : '',
                        title : '',
                        width : ''
                    };

                    if (headers[pp] === 'Special') {
                        header = {
                            text  : headers[pp],
                            color : 'black',
                            id    : '',
                            title : '',
                            width : '25%'
                        };
                    }

                    html += this.makeTh(header);
                }
            }

            html += '</tr>';
            for (it = 0; it < general.RecordArraySortable.length; it += 1) {
                html += "<tr>";
                for (pp in values) {
                    if (values.hasOwnProperty(pp)) {
                        str = '';
                        if (isNaN(general.RecordArraySortable[it][values[pp]])) {
                            if (general.RecordArraySortable[it][values[pp]]) {
                                str = general.RecordArraySortable[it][values[pp]];
                            }
                        } else {
                            if (general.RecordArraySortable[it][values[pp]]) {
                                if (/pi/.test(values[pp])) {
                                    str = general.RecordArraySortable[it][values[pp]].toFixed(2);
                                } else {
                                    str = general.RecordArraySortable[it][values[pp]].toString();
                                }
                            }
                        }

                        if (pp === "0") {
                            color = titleCol;
                        } else {
                            color = valueCol;
                        }

                        html += caap.makeTd({text: str, color: color, id: '', title: ''});
                    }
                }

                html += '</tr>';
            }

            html += '</table>';
            $("#caap_generalsStats").html(html);

            $("#caap_top span[id*='caap_generalsStats_']").click(function (e) {
                var clicked = '';

                if (e.target.id) {
                    clicked = e.target.id.replace(new RegExp("caap_.*Stats_"), '');
                }

                global.log(9, "Clicked", clicked);
                if (generalValues.indexOf(clicked) !== -1 && typeof sort[clicked] === 'function') {
                    general.RecordArraySortable.sort(sort[clicked]);
                }

                caap.UpdateDashboard(true);
            });

            /*-------------------------------------------------------------------------------------\
            Next we build the HTML to be included into the 'soldiers', 'item' and 'magic' div.
            We set our table and then build the header row.
            \-------------------------------------------------------------------------------------*/
            town = ['soldiers', 'item', 'magic'];
            headers = ['Name', 'Owned', 'Atk', 'Def', 'API', 'DPI', 'MPI', 'Cost', 'Upkeep', 'Hourly'];
            values  = ['name', 'owned', 'atk', 'def', 'api', 'dpi', 'mpi', 'cost', 'upkeep', 'hourly'];
            $.merge(townValues, values);
            for (i in town) {
                if (town.hasOwnProperty(i)) {
                    html = "<table width='100%' cellpadding='0px' cellspacing='0px'><tr>";
                    for (pp in headers) {
                        if (headers.hasOwnProperty(pp)) {
                            header = {
                                text  : '<span id="caap_' + town[i] + 'Stats_' + values[pp] + '" title="Click to sort" onmouseover="this.style.cursor=\'pointer\';" onmouseout="this.style.cursor=\'default\';">' + headers[pp] + '</span>',
                                color : 'blue',
                                id    : '',
                                title : '',
                                width : ''
                            };

                            html += this.makeTh(header);
                        }
                    }

                    html += '</tr>';
                    for (it = 0; it < this[town[i] + "ArraySortable"].length; it += 1) {
                        html += "<tr>";
                        for (pp in values) {
                            if (values.hasOwnProperty(pp)) {
                                str = '';
                                if (isNaN(this[town[i] + "ArraySortable"][it][values[pp]])) {
                                    if (this[town[i] + "ArraySortable"][it][values[pp]]) {
                                        str = this[town[i] + "ArraySortable"][it][values[pp]];
                                    }
                                } else {
                                    if (/pi/.test(values[pp])) {
                                        str = this[town[i] + "ArraySortable"][it][values[pp]].toFixed(2);
                                    } else {
                                        str = this.makeCommaValue(this[town[i] + "ArraySortable"][it][values[pp]]);
                                        if (values[pp] === 'cost' || values[pp] === 'upkeep' || values[pp] === 'hourly') {
                                            str = "$" + str;
                                        }
                                    }
                                }

                                if (pp === "0") {
                                    color = titleCol;
                                } else {
                                    color = valueCol;
                                }

                                html += caap.makeTd({text: str, color: color, id: '', title: ''});
                            }
                        }

                        html += '</tr>';
                    }

                    html += '</table>';
                    $("#caap_" + town[i] + "Stats").html(html);
                }
            }

            $("#caap_top span[id*='caap_" + town[0] + "Stats_']").click(function (e) {
                var clicked = '';

                if (e.target.id) {
                    clicked = e.target.id.replace(new RegExp("caap_.*Stats_"), '');
                }

                global.log(9, "Clicked", clicked);
                if (townValues.indexOf(clicked) !== -1 && typeof sort[clicked] === 'function') {
                    caap[town[0] + "ArraySortable"].sort(sort[clicked]);
                }

                caap.UpdateDashboard(true);
            });

            $("#caap_top span[id*='caap_" + town[1] + "Stats_']").click(function (e) {
                var clicked = '';

                if (e.target.id) {
                    clicked = e.target.id.replace(new RegExp("caap_.*Stats_"), '');
                }

                global.log(9, "Clicked", clicked);
                if (townValues.indexOf(clicked) !== -1 && typeof sort[clicked] === 'function') {
                    caap[town[1] + "ArraySortable"].sort(sort[clicked]);
                }

                caap.UpdateDashboard(true);
            });

            $("#caap_top span[id*='caap_" + town[2] + "Stats_']").click(function (e) {
                var clicked = '';

                if (e.target.id) {
                    clicked = e.target.id.replace(new RegExp("caap_.*Stats_"), '');
                }

                global.log(9, "Clicked", clicked);
                if (townValues.indexOf(clicked) !== -1 && typeof sort[clicked] === 'function') {
                    caap[town[2] + "ArraySortable"].sort(sort[clicked]);
                }

                caap.UpdateDashboard(true);
            });

            return true;
        } catch (err) {
            global.error("ERROR in UpdateDashboard: " + err);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    AddDBListener creates the listener for our dashboard controls.
    \-------------------------------------------------------------------------------------*/
    dbDisplayListener: function (e) {
        var value = e.target.options[e.target.selectedIndex].value;
        gm.setValue('DBDisplay', value);
        switch (value) {
        case "Target List" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', true);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', true);
            break;
        case "Target Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', true);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', true);
            break;
        case "User Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', true);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', false);
            break;
        case "Generals Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', true);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', false);
            break;
        case "Soldier Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', true);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', false);
            break;
        case "Item Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', true);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', false);
            break;
        case "Magic Stats" :
            caap.SetDisplay('infoMonster', false);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', true);
            caap.SetDisplay('buttonMonster', false);
            caap.SetDisplay('buttonTargets', false);
            break;
        case "Monster" :
            caap.SetDisplay('infoMonster', true);
            caap.SetDisplay('infoTargets1', false);
            caap.SetDisplay('infoTargets2', false);
            caap.SetDisplay('userStats', false);
            caap.SetDisplay('generalsStats', false);
            caap.SetDisplay('soldiersStats', false);
            caap.SetDisplay('itemStats', false);
            caap.SetDisplay('magicStats', false);
            caap.SetDisplay('buttonMonster', true);
            caap.SetDisplay('buttonTargets', false);
            break;
        default :
        }
    },

    refreshMonstersListener: function (e) {
        caap.monsterArray = [];
        gm.deleteValue("monsterArray");
        schedule.Set("monsterReview", 0);
        gm.setValue('monsterReviewCounter', -3);
        schedule.Set('NotargetFrombattle_monster', 0);
        gm.setValue('ReleaseControl', true);
        caap.UpdateDashboard();
    },

    liveFeedButtonListener: function (e) {
        caap.ClickAjax('army_news_feed.php');
    },

    clearTargetsButtonListener: function (e) {
        caap.ReconRecordArray = [];
        caap.SaveRecon();
        caap.UpdateDashboard(true);
    },

    AddDBListener: function () {
        try {
            global.log(1, "Adding listeners for caap_top");
            if (!$('#caap_DBDisplay').length) {
                global.ReloadCastleAge();
            }

            $('#caap_DBDisplay').change(this.dbDisplayListener);
            $('#caap_refreshMonsters').click(this.refreshMonstersListener);
            $('#caap_liveFeed').click(this.liveFeedButtonListener);
            $('#caap_clearTargets').click(this.clearTargetsButtonListener);
            global.log(8, "Listeners added for caap_top");
            return true;
        } catch (err) {
            global.error("ERROR in AddDBListener: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          EVENT LISTENERS
    // Watch for changes and update the controls
    /////////////////////////////////////////////////////////////////////

    SetDisplay: function (idName, setting) {
        try {
            if (setting === true) {
                $('#caap_' + idName).css('display', 'block');
            } else {
                $('#caap_' + idName).css('display', 'none');
            }

            return true;
        } catch (err) {
            global.error("ERROR in SetDisplay: " + err);
            return false;
        }
    },

    CheckBoxListener: function (e) {
        try {
            var idName        = e.target.id.replace(/caap_/i, ''),
                DocumentTitle = '',
                d             = '';

            global.log(1, "Change: setting '" + idName + "' to " + e.target.checked);
            gm.setValue(idName, e.target.checked);
            if (e.target.className) {
                caap.SetDisplay(e.target.className, e.target.checked);
            }

            switch (idName) {
            case "AutoStatAdv" :
                global.log(9, "AutoStatAdv");
                if (e.target.checked) {
                    caap.SetDisplay('Status_Normal', false);
                    caap.SetDisplay('Status_Adv', true);
                } else {
                    caap.SetDisplay('Status_Normal', true);
                    caap.SetDisplay('Status_Adv', false);
                }

                caap.statsMatch = true;
                break;
            case "HideAds" :
                global.log(9, "HideAds");
                if (e.target.checked) {
                    $('.UIStandardFrame_SidebarAds').css('display', 'none');
                } else {
                    $('.UIStandardFrame_SidebarAds').css('display', 'block');
                }

                break;
            case "BannerDisplay" :
                global.log(9, "BannerDisplay");
                if (e.target.checked) {
                    $('#caap_BannerHide').css('display', 'block');
                } else {
                    $('#caap_BannerHide').css('display', 'none');
                }

                break;
            case "IgnoreBattleLoss" :
                global.log(9, "IgnoreBattleLoss");
                if (e.target.checked) {
                    global.log(1, "Ignore Battle Losses has been enabled.");
                    gm.deleteValue("BattlesLostList");
                    global.log(1, "Battle Lost List has been cleared.");
                }

                break;
            case "SetTitle" :
            case "SetTitleAction" :
            case "SetTitleName" :
                global.log(9, idName);
                if (e.target.checked) {
                    if (gm.getValue('SetTitleAction', false)) {
                        d = $('#caap_activity_mess').html();
                        if (d) {
                            DocumentTitle += d.replace("Activity: ", '') + " - ";
                        }
                    }

                    if (gm.getValue('SetTitleName', false)) {
                        DocumentTitle += caap.stats.PlayerName + " - ";
                    }

                    document.title = DocumentTitle + global.documentTitle;
                } else {
                    document.title = global.documentTitle;
                }

                break;
            case "unlockMenu" :
                global.log(9, "unlockMenu");
                if (e.target.checked) {
                    $(":input[id^='caap_']").attr({disabled: true});
                    caap.caapDivObject.css('cursor', 'move').draggable({
                        stop: function () {
                            caap.SaveControlXY();
                        }
                    });

                    caap.caapTopObject.css('cursor', 'move').draggable({
                        stop: function () {
                            caap.SaveDashboardXY();
                        }
                    });
                } else {
                    caap.caapDivObject.css('cursor', '').draggable("destroy");
                    caap.caapTopObject.css('cursor', '').draggable("destroy");
                    $(":input[id^='caap_']").attr({disabled: false});
                }

                break;
            case "AutoElite" :
                global.log(9, "AutoElite");
                schedule.Set('AutoEliteGetList', 0);
                schedule.Set('AutoEliteReqNext', 0);
                gm.deleteValue('AutoEliteEnd');
                gm.deleteValue('MyEliteTodo');
                if (!gm.getValue('FillArmy', false)) {
                    gm.deleteValue(caap.friendListType.giftc.name + 'Requested');
                    gm.deleteValue(caap.friendListType.giftc.name + 'Responded');
                }

                break;
            case "AutoPotions" :
                global.log(9, "AutoPotions");
                gm.deleteValue('AutoPotionTimer');
                break;
            case "AchievementMode" :
                global.log(9, "AchievementMode");
                schedule.Set("monsterReview", 0);
                gm.setValue('monsterReviewCounter', -3);
                break;
            default :
            }

            return true;
        } catch (err) {
            global.error("ERROR in CheckBoxListener: " + err);
            return false;
        }
    },

    TextBoxListener: function (e) {
        try {
            var idName = e.target.id.replace(/caap_/i, '');
            global.log(1, 'Change: setting "' + idName + '" to "' + e.target.value + '"');
            if (/Style+/.test(idName)) {
                switch (idName) {
                case "StyleBackgroundLight" :
                    if (e.target.value.substr(0, 1) !== '#') {
                        e.target.value = '#' + e.target.value;
                    }

                    gm.setValue("CustStyleBackgroundLight", e.target.value);
                    break;
                case "StyleBackgroundDark" :
                    if (e.target.value.substr(0, 1) !== '#') {
                        e.target.value = '#' + e.target.value;
                    }

                    gm.setValue("CustStyleBackgroundDark", e.target.value);
                    break;
                case "StyleOpacityLight" :
                    gm.setValue("CustStyleOpacityLight", e.target.value);
                    break;
                case "StyleOpacityDark" :
                    gm.setValue("CustStyleOpacityDark", e.target.value);
                    break;
                default :
                }
            } else if (/AttrValue+/.test(idName)) {
                caap.statsMatch = true;
            } else if (/MaxToFortify/.test(idName)) {
                schedule.Set("monsterReview", 0);
                gm.setValue('monsterReviewCounter', -3);
            } else if (/energyPotions+/.test(idName) || /staminaPotions+/.test(idName)) {
                gm.deleteValue('AutoPotionTimer');
            }

            gm.setValue(idName, e.target.value);
            return true;
        } catch (err) {
            global.error("ERROR in TextBoxListener: " + err);
            return false;
        }
    },

    DropBoxListener: function (e) {
        try {
            if (e.target.selectedIndex > 0) {
                var idName = e.target.id.replace(/caap_/i, ''),
                    value  = e.target.options[e.target.selectedIndex].value,
                    title  = e.target.options[e.target.selectedIndex].title;

                global.log(1, 'Change: setting "' + idName + '" to "' + value + '" with title "' + title + '"');
                gm.setValue(idName, value);
                e.target.title = title;
                if (idName === 'WhenQuest' || idName === 'WhenBattle' || idName === 'WhenMonster' || idName === 'LevelUpGeneral') {
                    caap.SetDisplay(idName + 'Hide', (value !== 'Never'));
                    if (idName === 'WhenBattle' || idName === 'WhenMonster') {
                        caap.SetDisplay(idName + 'XStamina', (value === 'At X Stamina'));
                        caap.SetDisplay('WhenBattleStayHidden1', ((gm.getValue('WhenBattle', false) === 'Stay Hidden' && gm.getValue('WhenMonster', false) !== 'Stay Hidden')));
                        if (idName === 'WhenBattle') {
                            if (value === 'Never') {
                                caap.SetDivContent('battle_mess', 'Battle off');
                            } else {
                                caap.SetDivContent('battle_mess', '');
                            }
                        } else if (idName === 'WhenMonster') {
                            if (value === 'Never') {
                                caap.SetDivContent('monster_mess', 'Monster off');
                            } else {
                                caap.SetDivContent('monster_mess', '');
                            }
                        }
                    }

                    if (idName === 'WhenQuest') {
                        caap.SetDisplay(idName + 'XEnergy', (value === 'At X Energy'));
                    }
                } else if (idName === 'QuestArea' || idName === 'QuestSubArea' || idName === 'WhyQuest') {
                    gm.setValue('AutoQuest', '');
                    caap.ClearAutoQuest();
                    if (idName === 'QuestArea') {
                        switch (value) {
                        case "Quest" :
                            $("#trQuestSubArea").css('display', 'table-row');
                            caap.ChangeDropDownList('QuestSubArea', caap.landQuestList);
                            break;
                        case "Demi Quests" :
                            $("#trQuestSubArea").css('display', 'table-row');
                            caap.ChangeDropDownList('QuestSubArea', caap.demiQuestList);
                            break;
                        case "Atlantis" :
                            $("#trQuestSubArea").css('display', 'table-row');
                            caap.ChangeDropDownList('QuestSubArea', caap.atlantisQuestList);
                            break;
                        default :
                        }
                    }
                } else if (idName === 'IdleGeneral') {
                    gm.setValue('MaxIdleEnergy', 0);
                    gm.setValue('MaxIdleStamina', 0);
                } else if (idName === 'TargetType') {
                    switch (value) {
                    case "Freshmeat" :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', false);
                        break;
                    case "Userid List" :
                        caap.SetDisplay('FreshmeatSub', false);
                        caap.SetDisplay('UserIdsSub', true);
                        caap.SetDisplay('RaidSub', false);
                        break;
                    case "Raid" :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', true);
                        break;
                    default :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', false);
                    }
                } else if (/Attribute?/.test(idName)) {
                    //gm.setValue("SkillPointsNeed", 1);
                    caap.statsMatch = true;
                } else if (idName === 'DisplayStyle') {
                    caap.SetDisplay(idName + 'Hide', (value === 'Custom'));
                    switch (value) {
                    case "CA Skin" :
                        gm.setValue("StyleBackgroundLight", "#E0C691");
                        gm.setValue("StyleBackgroundDark", "#B09060");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                        break;
                    case "None" :
                        gm.setValue("StyleBackgroundLight", "white");
                        gm.setValue("StyleBackgroundDark", "white");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                        break;
                    case "Custom" :
                        gm.setValue("StyleBackgroundLight", gm.getValue("CustStyleBackgroundLight", "#E0C691"));
                        gm.setValue("StyleBackgroundDark", gm.getValue("CustStyleBackgroundDark", "#B09060"));
                        gm.setValue("StyleOpacityLight", gm.getValue("CustStyleOpacityLight", "1"));
                        gm.setValue("StyleOpacityDark", gm.getValue("CustStyleOpacityDark", "1"));
                        break;
                    default :
                        gm.setValue("StyleBackgroundLight", "#efe");
                        gm.setValue("StyleBackgroundDark", "#fee");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                    }

                    caap.caapDivObject.css({
                        background: gm.getValue('StyleBackgroundDark', '#fee'),
                        opacity: gm.getValue('StyleOpacityDark', '1')
                    });

                    caap.caapTopObject.css({
                        background: gm.getValue('StyleBackgroundDark', '#fee'),
                        opacity: gm.getValue('StyleOpacityDark', '1')
                    });
                }
            }

            return true;
        } catch (err) {
            global.error("ERROR in DropBoxListener: " + err);
            return false;
        }
    },

    TextAreaListener: function (e) {
        try {
            var idName = e.target.id.replace(/caap_/i, '');
            var value = e.target.value;
            global.log(1, 'Change: setting "' + idName + '" to "' + value + '"');
            if (idName === 'orderbattle_monster' || idName === 'orderraid') {
                gm.setValue("resermonsterSelect", true);
                schedule.Set("monsterReview", 0);
                gm.setValue('monsterReviewCounter', -3);
            }

            if (idName === 'EliteArmyList' || idName === 'BattleTargets') {
                var eList = [];
                if (value.length) {
                    value = value.replace(/\n/gi, ',');
                    eList = value.split(',');
                    var fEmpty = function (e) {
                        return e !== '';
                    };

                    eList = eList.filter(fEmpty);
                    if (!eList.length) {
                        eList = [];
                    }
                }

                gm.setList(idName, eList);
                e.target.value = eList;
            } else {
                caap.SaveBoxText(idName);
            }

            return true;
        } catch (err) {
            global.error("ERROR in TextAreaListener: " + err);
            return false;
        }
    },

    PauseListener: function (e) {
        $('#caap_div').css({
            'background': gm.getValue('StyleBackgroundDark', '#fee'),
            'opacity': '1',
            'z-index': '3'
        });

        $('#caap_top').css({
            'background': gm.getValue('StyleBackgroundDark', '#fee'),
            'opacity': '1'
        });

        $('#caapPaused').css('display', 'block');
        if (global.is_chrome) {
            CE_message("paused", null, 'block');
        }

        gm.setValue('caapPause', 'block');
    },

    RestartListener: function (e) {
        $('#caapPaused').css('display', 'none');
        $('#caap_div').css({
            'background': gm.getValue('StyleBackgroundLight', '#efe'),
            'opacity': gm.getValue('StyleOpacityLight', '1'),
            'z-index': gm.getValue('caap_div_zIndex', '2'),
            'cursor': ''
        });

        $('#caap_top').css({
            'background': gm.getValue('StyleBackgroundLight', '#efe'),
            'opacity': gm.getValue('StyleOpacityLight', '1'),
            'z-index': gm.getValue('caap_top_zIndex', '1'),
            'cursor': ''
        });

        $(":input[id*='caap_']").attr({disabled: false});
        $('#unlockMenu').attr('checked', false);

        gm.setValue('caapPause', 'none');
        if (global.is_chrome) {
            CE_message("paused", null, gm.getValue('caapPause', 'none'));
        }

        gm.setValue('ReleaseControl', true);
        gm.setValue('resetselectMonster', true);
        caap.waitingForDomLoad = false;
    },

    ResetMenuLocationListener: function (e) {
        gm.deleteValue('caap_div_menuLeft');
        gm.deleteValue('caap_div_menuTop');
        gm.deleteValue('caap_div_zIndex');
        caap.controlXY.x = '';
        caap.controlXY.y = $(caap.controlXY.selector).offset().top;
        var caap_divXY = caap.GetControlXY(true);
        caap.caapDivObject.css({
            'cursor' : '',
            'z-index' : '2',
            'top' : caap_divXY.y + 'px',
            'left' : caap_divXY.x + 'px'
        });

        gm.deleteValue('caap_top_menuLeft');
        gm.deleteValue('caap_top_menuTop');
        gm.deleteValue('caap_top_zIndex');
        caap.dashboardXY.x = '';
        caap.dashboardXY.y = $(caap.dashboardXY.selector).offset().top - 10;
        var caap_topXY = caap.GetDashboardXY(true);
        caap.caapTopObject.css({
            'cursor' : '',
            'z-index' : '1',
            'top' : caap_topXY.y + 'px',
            'left' : caap_topXY.x + 'px'
        });

        $(":input[id^='caap_']").attr({disabled: false});
    },

    FoldingBlockListener: function (e) {
        try {
            var subId = e.target.id.replace(/_Switch/i, '');
            var subDiv = document.getElementById(subId);
            if (subDiv.style.display === "block") {
                global.log(1, 'Folding: ' + subId);
                subDiv.style.display = "none";
                e.target.innerHTML = e.target.innerHTML.replace(/-/, '+');
                gm.setValue('Control_' + subId.replace(/caap_/i, ''), "none");
            } else {
                global.log(1, 'Unfolding: ' + subId);
                subDiv.style.display = "block";
                e.target.innerHTML = e.target.innerHTML.replace(/\+/, '-');
                gm.setValue('Control_' + subId.replace(/caap_/i, ''), "block");
            }

            return true;
        } catch (err) {
            global.error("ERROR in FoldingBlockListener: " + err);
            return false;
        }
    },

    whatClickedURLListener: function (event) {
        var obj = event.target;
        while (obj && !obj.href) {
            obj = obj.parentNode;
        }

        if (obj && obj.href) {
            gm.setValue('clickUrl', obj.href);
            global.log(9, 'globalContainer', obj.href);
        } else {
            if (obj && !obj.href) {
                global.log(1, 'globalContainer no href', obj);
            }
        }
    },

    whatFriendBox: function (event) {
        global.log(9, 'whatFriendBox', event);
        var obj    = event.target,
            userID = [],
            txt    = '';

        while (obj && !obj.id) {
            obj = obj.parentNode;
        }

        if (obj && obj.id) {
            global.log(9, 'globalContainer', obj.onclick);
            userID = obj.onclick.toString().match(/friendKeepBrowse\('([0-9]+)'/);
            if (userID && userID.length === 2) {
                txt = "?casuser=" + userID[1];
            }

            gm.setValue('clickUrl', 'http://apps.facebook.com/castle_age/keep.php' + txt);
        }

        global.log(9, 'globalContainer', obj.id, txt);
    },

    windowResizeListener: function (e) {
        if (window.location.href.indexOf('castle_age')) {
            var caap_divXY = caap.GetControlXY();
            caap.caapDivObject.css('left', caap_divXY.x + 'px');
            var caap_topXY = caap.GetDashboardXY();
            caap.caapTopObject.css('left', caap_topXY.x + 'px');
        }
    },

    targetList: [
        "app_body",
        "index",
        "keep",
        "generals",
        "battle_monster",
        "battle",
        "battlerank",
        "battle_train",
        "arena",
        "quests",
        "raid",
        "symbolquests",
        "alchemy",
        "goblin_emp",
        "soldiers",
        "item",
        "land",
        "magic",
        "oracle",
        "symbols",
        "treasure_chest",
        "gift",
        "apprentice",
        "news",
        "friend_page",
        "party",
        "comments",
        "army",
        "army_news_feed",
        "army_reqs"
    ],

    AddListeners: function () {
        try {
            global.log(1, "Adding listeners for caap_div");
            if ($('#caap_div').length === 0) {
                throw "Unable to find div for caap_div";
            }

            $('#caap_div input:checkbox[id^="caap_"]').change(this.CheckBoxListener);
            $('#caap_div input:text[id^="caap_"]').change(this.TextBoxListener);
            $('#unlockMenu').change(this.CheckBoxListener);
            $('#caap_div select[id^="caap_"]').change(this.DropBoxListener);
            $('#caap_div textarea[id^="caap_"]').change(this.TextAreaListener);
            $('#caap_div a[id^="caap_Switch"]').click(this.FoldingBlockListener);
            $('#caap_FillArmy').click(function (e) {
                gm.setValue("FillArmy", true);
                gm.deleteValue("ArmyCount");
                gm.deleteValue('FillArmyList');
                gm.deleteValue(caap.friendListType.giftc.name + 'Responded');
                gm.deleteValue(caap.friendListType.facebook.name + 'Responded');

            });

            $('#caap_StartedColorSelect').click(function (e) {
                var display = 'none';
                if ($('#caap_ColorSelectorDiv1').css('display') === 'none') {
                    display = 'block';
                }

                $('#caap_ColorSelectorDiv1').css('display', display);
            });

            $('#caap_StopedColorSelect').click(function (e) {
                var display = 'none';
                if ($('#caap_ColorSelectorDiv2').css('display') === 'none') {
                    display = 'block';
                }

                $('#caap_ColorSelectorDiv2').css('display', display);
            });

            $('#caap_ResetMenuLocation').click(this.ResetMenuLocationListener);
            $('#caap_resetElite').click(function (e) {
                schedule.Set('AutoEliteGetList', 0);
                schedule.Set('AutoEliteReqNext', 0);
                gm.deleteValue('AutoEliteEnd');
                if (!gm.getValue('FillArmy', false)) {
                    gm.deleteValue(caap.friendListType.giftc.name + 'Requested');
                    gm.deleteValue(caap.friendListType.giftc.name + 'Responded');
                }
            });

            $('#caapRestart').click(this.RestartListener);
            $('#caap_control').mousedown(this.PauseListener);
            if (global.is_chrome) {
                $('#caap_control').mousedown(this.PauseListener);
            }

            $('#stopAutoQuest').click(function (e) {
                gm.setValue('AutoQuest', '');
                gm.setValue('WhyQuest', 'Manual');
                global.log(1, 'Change: setting stopAutoQuest and go to Manual');
                caap.ManualAutoQuest();
            });

            if ($('#app46755028429_globalContainer').length === 0) {
                throw 'Global Container not found';
            }

            // Fires when CAAP navigates to new location
            $('#app46755028429_globalContainer').find('a').bind('click', this.whatClickedURLListener);
            $('#app46755028429_globalContainer').find("div[id*='app46755028429_friend_box_']").bind('click', this.whatFriendBox);

            $('#app46755028429_globalContainer').bind('DOMNodeInserted', function (event) {
                var targetStr = event.target.id.replace('app46755028429_', '');
                // Uncomment this to see the id of domNodes that are inserted

                /*
                if (event.target.id && !event.target.id.match(/globalContainer/) && !event.target.id.match(/time/)) {
                    caap.SetDivContent('debug2_mess', targetStr);
                    alert(event.target.id);
                }
                */

                if ($.inArray(targetStr, caap.targetList) !== -1) {
                    global.log(9, "Refreshing DOM Listeners", event.target.id);
                    caap.waitingForDomLoad = false;
                    $('#app46755028429_globalContainer').find('a').unbind('click', caap.whatClickedURLListener);
                    $('#app46755028429_globalContainer').find('a').bind('click', caap.whatClickedURLListener);
                    $('#app46755028429_globalContainer').find("div[id*='app46755028429_friend_box_']").unbind('click', caap.whatFriendBox);
                    $('#app46755028429_globalContainer').find("div[id*='app46755028429_friend_box_']").bind('click', caap.whatFriendBox);
                    window.setTimeout(function () {
                        caap.CheckResults();
                    }, 100);
                }

                // Income timer
                if (targetStr === "gold_time_value") {
                    var payTimer = $(event.target).text().match(/([0-9]+):([0-9]+)/);
                    global.log(10, "gold_time_value", payTimer);
                    if (payTimer && payTimer.length === 3) {
                        caap.stats.gold.payTime.ticker = payTimer[0];
                        caap.stats.gold.payTime.minutes = parseInt(payTimer[1], 10);
                        caap.stats.gold.payTime.seconds = parseInt(payTimer[2], 10);
                    }
                }

                // Energy
                if (targetStr === "energy_current_value") {
                    var energy = parseInt($(event.target).text(), 10),
                        tempE  = null;

                    global.log(9, "energy_current_value", energy);
                    if (typeof energy === 'number') {
                        tempE = caap.GetStatusNumbers(energy + "/" + caap.stats.energy.max);
                        if (tempE) {
                            caap.stats.energy = tempE;
                        } else {
                            global.log(1, "Unable to get energy levels");
                        }
                    }
                }

                // Health
                if (targetStr === "health_current_value") {
                    var health = parseInt($(event.target).text(), 10),
                        tempH  = null;

                    global.log(9, "health_current_value", health);
                    if (typeof health === 'number') {
                        tempH = caap.GetStatusNumbers(health + "/" + caap.stats.health.max);
                        if (tempH) {
                            caap.stats.health = tempH;
                        } else {
                            global.log(1, "Unable to get health levels");
                        }
                    }
                }

                // Stamina
                if (targetStr === "stamina_current_value") {
                    var stamina = parseInt($(event.target).text(), 10),
                        tempS   = null;

                    global.log(9, "stamina_current_value", stamina);
                    if (typeof stamina === 'number') {
                        tempS = caap.GetStatusNumbers(stamina + "/" + caap.stats.stamina.max);
                        if (tempS) {
                            caap.stats.stamina = tempS;
                        } else {
                            global.log(1, "Unable to get stamina levels");
                        }
                    }
                }

                // Reposition the dashboard
                if (event.target.id === caap.dashboardXY.selector) {
                    caap.caapTopObject.css('left', caap.GetDashboardXY().x + 'px');
                }
            });

            $(window).unbind('resize', this.windowResizeListener);
            $(window).bind('resize', this.windowResizeListener);

            global.log(8, "Listeners added for caap_div");
            return true;
        } catch (err) {
            global.error("ERROR in AddListeners: " + err);
            return false;
        }
    },


    /////////////////////////////////////////////////////////////////////
    //                          CHECK RESULTS
    // Called each iteration of main loop, this does passive checks for
    // results to update other functions.
    /////////////////////////////////////////////////////////////////////

    SetCheckResultsFunction: function (resultsFunction) {
        //this.JustDidIt('SetResultsFunctionTimer');
        schedule.Set('SetResultsFunctionTimer', 20);
        gm.setValue('ResultsFunction', resultsFunction);
    },

    pageList: {
        'index': {
            signaturePic: 'gif',
            CheckResultsFunction: 'CheckResults_index'
        },
        'battle_monster': {
            signaturePic: 'tab_monster_list_on.gif',
            CheckResultsFunction: 'CheckResults_fightList',
            subpages: ['onMonster']
        },
        'onMonster': {
            signaturePic: 'tab_monster_active.gif',
            CheckResultsFunction: 'CheckResults_viewFight'
        },
        'raid': {
            signaturePic: 'tab_raid_on.gif',
            CheckResultsFunction: 'CheckResults_fightList',
            subpages: ['onRaid']
        },
        'onRaid': {
            signaturePic: 'raid_map',
            CheckResultsFunction : 'CheckResults_viewFight'
        },
        'land': {
            signaturePic: 'tab_land_on.gif',
            CheckResultsFunction: 'CheckResults_land'
        },
        'generals': {
            signaturePic: 'tab_generals_on.gif',
            CheckResultsFunction: 'CheckResults_generals'
        },
        'quests': {
            signaturePic: 'tab_quest_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'symbolquests': {
            signaturePic: 'demi_quest_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'monster_quests': {
            signaturePic: 'tab_atlantis_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'gift_accept': {
            signaturePic: 'gif',
            CheckResultsFunction: 'CheckResults_gift_accept'
        },
        'army': {
            signaturePic: 'invite_on.gif',
            CheckResultsFunction: 'CheckResults_army'
        },
        'keep': {
            signaturePic: 'tab_stats_on.gif',
            CheckResultsFunction: 'CheckResults_keep'
        },
        'oracle': {
            signaturePic: 'oracle_on.gif',
            CheckResultsFunction: 'CheckResults_oracle'
        },
        'battlerank': {
            signaturePic: 'tab_battle_rank_on.gif',
            CheckResultsFunction: 'CheckResults_battlerank'
        },
        'war_rank': {
            signaturePic: 'tab_war_on.gif',
            CheckResultsFunction: 'CheckResults_war_rank'
        },
        'achievements': {
            signaturePic: 'tab_achievements_on.gif',
            CheckResultsFunction: 'CheckResults_achievements'
        },
        'battle': {
            signaturePic: 'battle_on.gif',
            CheckResultsFunction: 'CheckResults_battle'
        },
        'soldiers': {
            signaturePic: 'tab_soldiers_on.gif',
            CheckResultsFunction: 'CheckResults_soldiers'
        },
        'item': {
            signaturePic: 'tab_black_smith_on.gif',
            CheckResultsFunction: 'CheckResults_item'
        },
        'magic': {
            signaturePic: 'tab_magic_on.gif',
            CheckResultsFunction: 'CheckResults_magic'
        },
        'view_class_progress': {
            signaturePic: 'nm_class_whole_progress_bar.jpg',
            CheckResultsFunction: 'CheckResults_view_class_progress'
        }
    },

    trackPerformance: false,

    performanceTimer: function (marker) {
        if (!this.trackPerformance) {
            return;
        }

        var now = (new Date().getTime());
        var elapsedTime = now - parseInt(gm.getValue('performanceTimer', 0), 10);
        global.log(1, 'Performance Timer At ' + marker + ' Time elapsed: ' + elapsedTime);
        gm.setValue('performanceTimer', now.toString());
    },

    AddExpDisplay: function () {
        try {
            var expDiv = $("#app46755028429_st_2_5 strong"),
                enlDiv = null;

            if (!expDiv.length) {
                global.log(1, "Unable to get experience array");
                return false;
            }

            enlDiv = $("#caap_enl");
            if (enlDiv.length) {
                global.log(8, "Experience to Next Level already displayed. Updating.");
                enlDiv.html(this.stats.exp.dif);
            } else {
                global.log(8, "Prepending Experience to Next Level to display");
                expDiv.prepend("(<span id='caap_enl' style='color:red'>" + (this.stats.exp.dif) + "</span>) ");
            }

            this.SetDivContent('exp_mess', "Experience to next level: " + this.stats.exp.dif);
            return true;
        } catch (err) {
            global.error("ERROR in AddExpDisplay: " + err);
            return false;
        }
    },

    CheckResults: function () {
        try {
            // Check page to see if we should go to a page specific check function
            // todo find a way to verify if a function exists, and replace the array with a check_functionName exists check
            if (!schedule.Check('CheckResultsTimer')) {
                return false;
            }

            this.pageLoadOK = this.GetStats();

            this.AddExpDisplay();
            this.SetDivContent('level_mess', 'Expected next level: ' + schedule.FormatTime(new Date(this.stats.indicators.enl)));
            if (gm.getValue('DemiPointsFirst', false) && gm.getValue('WhenMonster') !== 'Never') {
                if (gm.getValue('DemiPointsDone', true)) {
                    this.SetDivContent('demipoint_mess', 'Daily Demi Points: Done');
                } else {
                    this.SetDivContent('demipoint_mess', 'Daily Demi Points: First');
                }
            } else {
                this.SetDivContent('demipoint_mess', '');
            }

            if (schedule.Display('BlessingTimer')) {
                if (schedule.Check('BlessingTimer')) {
                    this.SetDivContent('demibless_mess', 'Demi Blessing = none');
                } else {
                    this.SetDivContent('demibless_mess', 'Next Demi Blessing: ' + schedule.Display('BlessingTimer'));
                }
            }

            //this.performanceTimer('Start CheckResults');
            //this.JustDidIt('CheckResultsTimer');
            schedule.Set('CheckResultsTimer', 1);
            gm.setValue('page', '');
            gm.setValue('pageUserCheck', '');
            var pageUrl = gm.getValue('clickUrl', '');
            global.log(9, "Page url", pageUrl);
            if (pageUrl) {
                var pageUserCheck = pageUrl.match(/user=([0-9]+)/);
                global.log(6, "pageUserCheck", pageUserCheck);
                if (pageUserCheck) {
                    gm.setValue('pageUserCheck', pageUserCheck[1]);
                }
            }

            var page = 'None';
            if (pageUrl.match(new RegExp("\/[^\/]+.php", "i"))) {
                page = pageUrl.match(new RegExp("\/[^\/]+.php", "i"))[0].replace('/', '').replace('.php', '');
                global.log(9, "Page match", page);
            }

            if (this.pageList[page]) {
                if ($("img[src*='" + this.pageList[page].signaturePic + "']").length) {
                    page = gm.setValue('page', page);
                    global.log(9, "Page set value", page);
                }

                if (this.pageList[page].subpages) {
                    this.pageList[page].subpages.forEach(function (subpage) {
                        if ($("img[src*='" + caap.pageList[subpage].signaturePic + "']").length) {
                            page = gm.setValue('page', subpage);
                            global.log(9, "Page pubpage", page);
                        }
                    });
                }
            }

            var resultsDiv = $("span[class*='result_body']"),
                resultsText = '';

            if (resultsDiv && resultsDiv.length) {
                resultsText = $.trim(resultsDiv.text());
            }

            if (gm.getValue('page', '')) {
                global.log(1, 'Checking results for', page);
                if (typeof this[this.pageList[page].CheckResultsFunction] === 'function') {
                    this[this.pageList[page].CheckResultsFunction](resultsText);
                } else {
                    global.log(1, 'Check Results function not found', this[this.pageList[page].CheckResultsFunction]);
                }
            } else {
                global.log(1, 'No results check defined for', page);
            }

            //this.performanceTimer('Before selectMonster');
            this.selectMonster();
            //this.performanceTimer('Done selectMonster');
            this.UpdateDashboard();
            //this.performanceTimer('Done Dashboard');

            if (general.List.length <= 2) {
                schedule.Set("generals", 0);
                schedule.Set("allGenerals", 0);
                this.CheckGenerals();
            }

            if (this.stats.level < 10) {
                this.battlePage = 'battle_train,battle_off';
            } else {
                this.battlePage = 'battle';
            }

            // Check for Elite Guard Add image
            if (!gm.getValue('AutoEliteIgnore', false)) {
                if (this.CheckForImage('elite_guard_add') && gm.getValue('AutoEliteEnd', 'NoArmy') !== 'NoArmy') {
                    schedule.Set('AutoEliteGetList', 0);
                }
            }

            // If set and still recent, go to the function specified in 'ResultsFunction'
            var resultsFunction = gm.getValue('ResultsFunction', '');
            if ((resultsFunction) && !schedule.Check('SetResultsFunctionTimer')) {
                this[resultsFunction](resultsText);
            }

            //this.performanceTimer('Done CheckResults');
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults: " + err);
            return false;
        }
    },

    CheckResults_generals: function () {
        try {
            general.GetGenerals();
            general.GetEquippedStats();
            schedule.Set("generals", gm.getNumber("CheckGenerals", 24) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_generals: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          GET STATS
    // Functions that records all of base game stats, energy, stamina, etc.
    /////////////////////////////////////////////////////////////////////

    // text in the format '123/234'
    GetStatusNumbers: function (text) {
        try {
            var txtArr = [];

            if (!text || typeof text !== 'string') {
                global.log(1, "No text supplied for status numbers", text);
                return false;
            }

            txtArr = text.match(/([0-9]+)\/([0-9]+)/);
            if (txtArr.length !== 3) {
                global.log(1, "Unable to match status numbers", text);
                return false;
            }

            return {
                num: parseInt(txtArr[1], 10),
                max: parseInt(txtArr[2], 10),
                dif: parseInt(txtArr[2], 10) - parseInt(txtArr[1], 10)
            };
        } catch (err) {
            global.error("ERROR in GetStatusNumbers: " + err);
            return false;
        }
    },

    stats: {
        FBID       : 0,
        account    : '',
        PlayerName : '',
        level      : 0,
        army       : {
            actual : 0,
            capped : 0
        },
        generals   : {
            total  : 0,
            invade : 0
        },
        attack     : 0,
        defense    : 0,
        points     : {
            skill : 0,
            favor : 0
        },
        indicators : {
            bsi  : 0,
            lsi  : 0,
            sppl : 0,
            api  : 0,
            dpi  : 0,
            mpi  : 0,
            htl  : 0,
            hrtl : 0,
            enl  : new Date(2009, 1, 1).getTime()
        },
        gold : {
            cash    : 0,
            bank    : 0,
            total   : 0,
            income  : 0,
            upkeep  : 0,
            flow    : 0,
            payTime : {
                ticker  : '0:00',
                minutes : 0,
                seconds : 0
            }
        },
        rank : {
            battle       : 0,
            battlePoints : 0,
            war          : 0,
            warPoints    : 0
        },
        potions : {
            energy  : 0,
            stamina : 0
        },
        energy : {
            num : 0,
            max : 0,
            dif : 0
        },
        health : {
            num : 0,
            max : 0,
            dif : 0
        },
        stamina : {
            num : 0,
            max : 0,
            dif : 0
        },
        exp : {
            num : 0,
            max : 0,
            dif : 0
        },
        other : {
            qc  : 0,
            bww : 0,
            bwl : 0,
            te  : 0,
            tee : 0,
            wlr : 0,
            eer : 0
        },
        achievements : {
            battle : {
                invasions : {
                    won    : 0,
                    lost   : 0,
                    streak : 0,
                    ratio  : 0
                },
                duels : {
                    won    : 0,
                    lost   : 0,
                    streak : 0,
                    ratio  : 0
                }
            },
            monster : {
                gildamesh : 0,
                colossus  : 0,
                sylvanas  : 0,
                keira     : 0,
                legion    : 0,
                skaar     : 0,
                lotus     : 0,
                dragons   : 0,
                cronus    : 0,
                sieges    : 0,
                genesis   : 0
            },
            other : {
                alchemy : 0
            }
        },
        character : {
            warrior : {
                name    : '',
                level   : 0,
                percent : 0
            },
            rogue : {
                name    : '',
                level   : 0,
                percent : 0
            },
            mage : {
                name    : '',
                level   : 0,
                percent : 0
            },
            cleric : {
                name    : '',
                level   : 0,
                percent : 0
            },
            warlock : {
                name    : '',
                level   : 0,
                percent : 0
            },
            ranger : {
                name    : '',
                level   : 0,
                percent : 0
            }
        }

    },

    LoadStats: function () {
        $.extend(this.stats, gm.getJValue('userStats'));
        global.log(2, "Stats", this.stats);
    },

    SaveStats: function () {
        gm.setJValue('userStats', this.stats);
        global.log(2, "Stats", this.stats);
    },

    GetStats: function () {
        try {
            var cashDiv        = null,
                energyDiv      = null,
                healthDiv      = null,
                staminaDiv     = null,
                expDiv         = null,
                levelDiv       = null,
                armyDiv        = null,
                pointsDiv      = null,
                passed         = true,
                temp           = null,
                levelArray     = [],
                newLevel       = 0,
                armyArray      = [],
                pointsArray    = [],
                xS             = 0,
                xE             = 0;

            global.log(8, "Getting Gold, Energy, Health, Stamina and Experience");
            // gold
            cashDiv = $("#app46755028429_gold_current_value");
            if (cashDiv.length) {
                global.log(8, 'Getting current cash value');
                temp = this.NumberOnly(cashDiv.text());
                if (!isNaN(temp)) {
                    this.stats.gold.cash = temp;
                    this.stats.gold.total = this.stats.gold.bank + this.stats.gold.cash;
                } else {
                    global.log(1, "Cash value is not a number");
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get cashDiv");
                passed = false;
            }

            // energy
            energyDiv = $("#app46755028429_st_2_2");
            if (energyDiv.length) {
                global.log(8, 'Getting current energy levels');
                temp = this.GetStatusNumbers(energyDiv.text());
                if (temp) {
                    this.stats.energy = temp;
                } else {
                    global.log(1, "Unable to get energy levels");
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get energyDiv");
                passed = false;
            }

            // health
            healthDiv = $("#app46755028429_st_2_3");
            if (healthDiv.length) {
                global.log(8, 'Getting current health levels');
                temp = this.GetStatusNumbers(healthDiv.text());
                if (temp) {
                    this.stats.health = temp;
                } else {
                    global.log(1, "Unable to get health levels");
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get healthDiv");
                passed = false;
            }

            // stamina
            staminaDiv = $("#app46755028429_st_2_4");
            if (staminaDiv.length) {
                global.log(8, 'Getting current stamina values');
                temp = this.GetStatusNumbers(staminaDiv.text());
                if (temp) {
                    this.stats.stamina = temp;
                } else {
                    global.log(1, "Unable to get stamina values");
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get staminaDiv");
                passed = false;
            }

            // experience
            expDiv = $("#app46755028429_st_2_5");
            if (expDiv.length) {
                global.log(8, 'Getting current experience values');
                temp = this.GetStatusNumbers(expDiv.text());
                if (temp) {
                    this.stats.exp = temp;
                } else {
                    global.log(1, "Unable to get experience values");
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get expDiv");
                passed = false;
            }

            // level
            levelDiv = $("#app46755028429_st_5");
            if (levelDiv.length) {
                levelArray = levelDiv.text().match(/Level: ([0-9]+)!/);
                if (levelArray && levelArray.length === 2) {
                    global.log(8, 'Getting current level');
                    newLevel = parseInt(levelArray[1], 10);
                    if (newLevel > this.stats.level) {
                        global.log(1, 'New level. Resetting Best Land Cost.');
                        gm.deleteValue('BestLandCost');
                        this.stats.level = newLevel;
                    }
                } else {
                    global.log(1, 'levelArray incorrect');
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get levelDiv");
                passed = false;
            }

            // army
            armyDiv = $("#app46755028429_main_bntp a[href*='army.php']");
            if (armyDiv.length) {
                armyArray = armyDiv.text().match(/My Army \(([0-9]+)\)/);
                if (armyArray && armyArray.length === 2) {
                    global.log(8, 'Getting current army count');
                    this.stats.army.actual = parseInt(armyArray[1], 10);
                    temp = Math.min(this.stats.army.actual, 501);
                    if (temp >= 0 && temp <= 501) {
                        this.stats.army.capped = temp;
                    } else {
                        global.log(1, "Army count not in limits");
                        passed = false;
                    }
                } else {
                    global.log(1, 'armyArray incorrect');
                    passed = false;
                }
            } else {
                global.log(1, "Unable to get armyDiv");
                passed = false;
            }

            // upgrade points
            pointsDiv = $("#app46755028429_main_bntp a[href*='keep.php']");
            if (pointsDiv.length) {
                pointsArray = pointsDiv.text().match(/My Stats \(\+([0-9]+)\)/);
                if (pointsArray && pointsArray.length === 2) {
                    global.log(8, 'Getting current upgrade points');
                    this.stats.points.skill = parseInt(pointsArray[1], 10);
                } else {
                    global.log(8, 'No upgrade points found');
                    this.stats.points.skill = 0;
                }
            } else {
                global.log(1, "Unable to get pointsDiv");
                passed = false;
            }

            // Indicators: Hours To Level, Time Remaining To Level and Expected Next Level
            if (this.stats.exp) {
                global.log(8, 'Calculating time to next level');
                xS = gm.getNumber("expStaminaRatio", 2.4);
                xE = parseFloat(gm.getObjVal('AutoQuest', 'expRatio')) || gm.getNumber("expEnergyRatio", 1.4);
                this.stats.indicators.htl = ((this.stats.level * 12.5) - (this.stats.stamina.max * xS) - (this.stats.energy.max * xE)) / (12 * (xS + xE));
                this.stats.indicators.hrtl = (this.stats.exp.dif - (this.stats.stamina.num * xS) - (this.stats.energy.num * xE)) / (12 * (xS + xE));
                this.stats.indicators.enl = new Date().getTime() + Math.ceil(this.stats.indicators.hrtl * 60 * 60 * 1000);
            } else {
                global.log(1, 'Could not calculate time to next level. Missing experience stats!');
                passed = false;
            }

            if (!passed)  {
                global.log(8, 'Saving stats');
                this.SaveStats();
            }

            if (passed && this.stats.energy.max === 0 && this.stats.health.max === 0 && this.stats.stamina.max === 0) {
                global.alert("Paused as this account may have been disabled!");
                global.log(1, "Paused as this account may have been disabled!", this.stats);
                this.PauseListener();
            }

            return passed;
        } catch (err) {
            global.error("ERROR GetStats: " + err);
            return false;
        }
    },

    CheckResults_keep: function () {
        try {
            var rankImg        = null,
                warRankImg     = null,
                playerName     = null,
                moneyStored    = null,
                income         = null,
                upkeep         = null,
                energyPotions  = null,
                staminaPotions = null,
                otherStats     = null,
                attack         = null,
                defense        = null;

            if ($(".keep_attribute_section").length) {
                global.log(8, "Getting new values from player keep");
                // rank
                rankImg = $("img[src*='gif/rank']");
                if (rankImg.length) {
                    rankImg = rankImg.attr("src").split('/');
                    this.stats.rank.battle = parseInt((rankImg[rankImg.length - 1].match(/rank([0-9]+)\.gif/))[1], 10);
                } else {
                    global.log(1, 'Using stored rank.');
                }

                // war rank
                warRankImg = $("img[src*='war_rank_']");
                if (warRankImg.length) {
                    warRankImg = warRankImg.attr("src").split('/');
                    this.stats.rank.war = parseInt((warRankImg[warRankImg.length - 1].match(/war_rank_([0-9]+)\.gif/))[1], 10);
                } else {
                    global.log(1, 'Using stored warRank.');
                }

                // PlayerName
                playerName = $(".keep_stat_title_inc");
                if (playerName.length) {
                    this.stats.PlayerName = playerName.text().match(new RegExp("\"(.+)\","))[1];
                } else {
                    global.log(1, 'Using stored PlayerName.');
                }

                // Attack
                attack = $(".attribute_stat_container:eq(2)");
                if (attack.length) {
                    this.stats.attack = parseInt(attack.text().match(new RegExp("\\s*([0-9]+).*"))[1], 10);
                } else {
                    global.log(1, 'Using stored attack value.');
                }

                // Defense
                defense = $(".attribute_stat_container:eq(3)");
                if (defense.length) {
                    this.stats.defense = parseInt(defense.text().match(new RegExp("\\s*([0-9]+).*"))[1], 10);
                } else {
                    global.log(1, 'Using stored defense value.');
                }

                // Check for Gold Stored
                moneyStored = $(".statsTB .money");
                if (moneyStored.length) {
                    this.stats.gold.bank = this.NumberOnly(moneyStored.text());
                    this.stats.gold.total = this.stats.gold.bank + this.stats.gold.cash;
                } else {
                    global.log(1, 'Using stored inStore.');
                }

                // Check for income
                income = $(".statsTB .positive:first");
                if (income.length) {
                    this.stats.gold.income = this.NumberOnly(income.text());
                } else {
                    global.log(1, 'Using stored income.');
                }

                // Check for upkeep
                upkeep = $(".statsTB .negative");
                if (upkeep.length) {
                    this.stats.gold.upkeep = this.NumberOnly(upkeep.text());
                } else {
                    global.log(1, 'Using stored upkeep.');
                }

                // Cash Flow
                this.stats.gold.flow = this.stats.gold.income - this.stats.gold.upkeep;

                // Energy potions
                energyPotions = $("img[title='Energy Potion']");
                if (energyPotions.length) {
                    this.stats.potions.energy = energyPotions.parent().next().text().replace(new RegExp("[^0-9\\.]", "g"), "");
                } else {
                    this.stats.potions.energy = 0;
                }

                // Stamina potions
                staminaPotions = $("img[title='Stamina Potion']");
                if (staminaPotions.length) {
                    this.stats.potions.stamina = staminaPotions.parent().next().text().replace(new RegExp("[^0-9\\.]", "g"), "");
                } else {
                    this.stats.potions.stamina = 0;
                }

                // Other stats
                // Quests Completed
                otherStats = $(".statsTB .keepTable1 tr:eq(0) td:last");
                if (otherStats.length) {
                    this.stats.other.qc = parseInt(otherStats.text(), 10);
                } else {
                    global.log(1, 'Using stored other.');
                }

                // Battles/Wars Won
                otherStats = $(".statsTB .keepTable1 tr:eq(1) td:last");
                if (otherStats.length) {
                    this.stats.other.bww = parseInt(otherStats.text(), 10);
                } else {
                    global.log(1, 'Using stored other.');
                }

                // Battles/Wars Lost
                otherStats = $(".statsTB .keepTable1 tr:eq(2) td:last");
                if (otherStats.length) {
                    this.stats.other.bwl = parseInt(otherStats.text(), 10);
                } else {
                    global.log(1, 'Using stored other.');
                }

                // Times eliminated
                otherStats = $(".statsTB .keepTable1 tr:eq(3) td:last");
                if (otherStats.length) {
                    this.stats.other.te = parseInt(otherStats.text(), 10);
                } else {
                    global.log(1, 'Using stored other.');
                }

                // Times you eliminated an enemy
                otherStats = $(".statsTB .keepTable1 tr:eq(4) td:last");
                if (otherStats.length) {
                    this.stats.other.tee = parseInt(otherStats.text(), 10);
                } else {
                    global.log(1, 'Using stored other.');
                }

                // Win/Loss Ratio (WLR)
                if (this.stats.other.bwl !== 0) {
                    this.stats.other.wlr = this.stats.other.bww / this.stats.other.bwl;
                } else {
                    this.stats.other.wlr = Infinity;
                }

                // Enemy Eliminated Ratio/Eliminated (EER)
                if (this.stats.other.tee !== 0) {
                    this.stats.other.eer = this.stats.other.tee / this.stats.other.te;
                } else {
                    this.stats.other.eer = Infinity;
                }

                // Indicators
                this.stats.indicators.bsi = (this.stats.attack + this.stats.defense) / this.stats.level;
                this.stats.indicators.lsi = (this.stats.energy.max + (2 * this.stats.stamina.max)) / this.stats.level;
                this.stats.indicators.sppl = (this.stats.energy.max + (2 * this.stats.stamina.max) + this.stats.attack + this.stats.defense + this.stats.health.max - 122) / this.stats.level;
                this.stats.indicators.api = (this.stats.attack + (this.stats.defense * 0.7));
                this.stats.indicators.dpi = (this.stats.defense + (this.stats.attack * 0.7));
                this.stats.indicators.mpi = ((this.stats.indicators.api + this.stats.indicators.dpi) / 2);
                schedule.Set("keep", gm.getNumber("CheckKeep", 1) * 3600, 300);
                this.SaveStats();
            } else {
                global.log(1, "On another player's keep", $("a[href*='keep.php?user=']").attr("href").match(/user=([0-9]+)/)[1]);
            }

            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_keep: " + err);
            return false;
        }
    },

    CheckResults_oracle: function () {
        try {
            var favorDiv = null,
                text     = '',
                temp     = [],
                save     = false;

            favorDiv = $(".title_action");
            if (favorDiv.length) {
                text = favorDiv.text();
                temp = text.match(new RegExp("\\s*You have zero favor points!\\s*"));
                if (temp && temp.length === 1) {
                    global.log(1, 'Got number of Favor Points.');
                    this.stats.points.favor = 0;
                    save = true;
                } else {
                    temp = text.match(new RegExp("\\s*You have a favor point!\\s*"));
                    if (temp && temp.length === 1) {
                        global.log(1, 'Got number of Favor Points.');
                        this.stats.points.favor = 1;
                        save = true;
                    } else {
                        temp = text.match(new RegExp("\\s*You have ([0-9]+) favor points!\\s*"));
                        if (temp && temp.length === 2) {
                            global.log(1, 'Got number of Favor Points.');
                            this.stats.points.favor = parseInt(temp[1], 10);
                            save = true;
                        } else {
                            global.log(1, 'Favor Points RegExp not matched.');
                        }
                    }
                }
            } else {
                global.log(1, 'Favor Points div not found.');
            }

            if (save) {
                this.SaveStats();
            }

            schedule.Set("oracle", gm.getNumber("CheckOracle", 24) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_oracle: " + err);
            return false;
        }
    },

    soldiersArray: [],

    soldiersArraySortable: [],

    itemArray: [],

    itemArraySortable: [],

    magicArray: [],

    magicArraySortable: [],

    ItemsRecord: function () {
        this.data = {
            name    : '',
            upkeep  : 0,
            hourly  : 0,
            atk     : 0,
            def     : 0,
            owned   : 0,
            cost    : 0,
            api     : 0,
            dpi     : 0,
            mpi     : 0
        };
    },

    LoadTown: function () {
        $.extend(this.soldiersArray, gm.getJValue('soldiersStats'));
        $.merge(this.soldiersArraySortable, this.soldiersArray);
        $.extend(this.itemArray, gm.getJValue('itemStats'));
        $.merge(this.itemArraySortable, this.itemArray);
        $.extend(this.magicArray, gm.getJValue('magicStats'));
        $.merge(this.magicArraySortable, this.magicArray);
    },

    SaveTown: function () {
        gm.setJValue('soldiersStats', this.soldiersArray);
        gm.setJValue('itemStats', this.itemArray);
        gm.setJValue('magicStats', this.magicArray);
    },

    GetItems: function (type) {
        try {
            var rowDiv  = null,
                tempDiv = null,
                current = {},
                passed  = true,
                save    = false;

            this[type + 'Array'] = [];
            this[type + 'ArraySortable'] = [];
            rowDiv = $("td[class*='eq_buy_row']");
            if (rowDiv && rowDiv.length) {
                rowDiv.each(function (index) {
                    current = new caap.ItemsRecord();
                    tempDiv = $(this).find("div[class='eq_buy_txt_int'] strong");
                    if (tempDiv && tempDiv.length === 1) {
                        current.data.name = $.trim(tempDiv.text());
                    } else {
                        global.log(1, "Unable to get '" + type + "' name!");
                        passed = false;
                    }

                    if (passed) {
                        tempDiv = $(this).find("div[class='eq_buy_txt_int'] span[class='negative']");
                        if (tempDiv && tempDiv.length === 1) {
                            current.data.upkeep = caap.NumberOnly(tempDiv.text());
                        } else {
                            global.log(2, "No upkeep found for '" + type + "' '" + current.data.name + "'");
                        }

                        tempDiv = $(this).find("div[class='eq_buy_stats_int'] div");
                        if (tempDiv && tempDiv.length === 2) {
                            current.data.atk = caap.NumberOnly(tempDiv.eq(0).text());
                            current.data.def = caap.NumberOnly(tempDiv.eq(1).text());
                            current.data.api = (current.data.atk + (current.data.def * 0.7));
                            current.data.dpi = (current.data.def + (current.data.atk * 0.7));
                            current.data.mpi = ((current.data.api + current.data.dpi) / 2);
                        } else {
                            global.log(1, "No atk/def found for '" + type + "' '" + current.data.name + "'");
                        }

                        tempDiv = $(this).find("div[class='eq_buy_costs_int'] strong[class='gold']");
                        if (tempDiv && tempDiv.length === 1) {
                            current.data.cost = caap.NumberOnly(tempDiv.text());
                        } else {
                            global.log(2, "No cost found for '" + type + "' '" + current.data.name + "'");
                        }

                        tempDiv = $(this).find("div[class='eq_buy_costs_int'] tr:last td:first");
                        if (tempDiv && tempDiv.length === 1) {
                            current.data.owned = caap.NumberOnly(tempDiv.text());
                            current.data.hourly = current.data.owned * current.data.upkeep;
                        } else {
                            global.log(1, "No number owned found for '" + type + "' '" + current.data.name + "'");
                        }

                        caap[type + 'Array'].push(current.data);
                        save = true;
                    }
                });
            }

            if (save) {
                $.merge(this[type + 'ArraySortable'], this[type + 'Array']);
                this.SaveTown();
            } else {
                global.log(1, "Nothing to save for '" + type + "'");
            }

            return true;
        } catch (err) {
            global.error("ERROR in GetItems: " + err);
            return false;
        }
    },

    CheckResults_soldiers: function () {
        try {
            $("div[class='eq_buy_costs_int']").find("select[name='amount']:first option[value='5']").attr('selected', 'selected');
            this.GetItems("soldiers");
            schedule.Set("soldiers", gm.getNumber("CheckSoldiers", 48) * 3600, 300);
            global.log(3, "soldiersArray", this.soldiersArray);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_soldiers: " + err);
            return false;
        }
    },

    CheckResults_item: function () {
        try {
            $("div[class='eq_buy_costs_int']").find("select[name='amount']:first option[value='5']").attr('selected', 'selected');
            this.GetItems("item");
            schedule.Set("item", gm.getNumber("CheckItem", 48) * 3600, 300);
            global.log(3, "itemArray", this.itemArray);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_item: " + err);
            return false;
        }
    },

    CheckResults_magic: function () {
        try {
            $("div[class='eq_buy_costs_int']").find("select[name='amount']:first option[value='5']").attr('selected', 'selected');
            this.GetItems("magic");
            schedule.Set("magic", gm.getNumber("CheckMagic", 48) * 3600, 300);
            global.log(3, "magicArray", this.magicArray);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_magic: " + err);
            return false;
        }
    },

    CheckResults_battlerank: function () {
        try {
            var rankDiv = null,
                text     = '',
                temp     = [];

            rankDiv = $("div[style*='battle_rank_banner.jpg']");
            if (rankDiv.length) {
                text = rankDiv.text();
                temp = text.match(new RegExp(".*with (.*) Battle Points.*"));
                if (temp && temp.length === 2) {
                    global.log(1, 'Got Battle Rank Points.');
                    this.stats.rank.battlePoints = this.NumberOnly(temp[1]);
                    this.SaveStats();
                } else {
                    global.log(1, 'Battle Rank Points RegExp not matched.');
                }
            } else {
                global.log(1, 'Battle Rank Points div not found.');
            }

            schedule.Set("battlerank", gm.getNumber("CheckBattleRank", 24) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_battlerank: " + err);
            return false;
        }
    },

    CheckResults_war_rank: function () {
        try {
            var rankDiv = null,
                text     = '',
                temp     = [];

            rankDiv = $("div[style*='war_rank_banner.jpg']");
            if (rankDiv.length) {
                text = rankDiv.text();
                temp = text.match(new RegExp(".*with (.*) War Points.*"));
                if (temp && temp.length === 2) {
                    global.log(1, 'Got War Rank Points.');
                    this.stats.rank.warPoints = this.NumberOnly(temp[1]);
                    this.SaveStats();
                } else {
                    global.log(1, 'War Rank Points RegExp not matched.');
                }
            } else {
                global.log(1, 'War Rank Points div not found.');
            }

            schedule.Set("warrank", gm.getNumber("CheckWarRank", 24) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_war_rank: " + err);
            return false;
        }
    },

    CheckResults_achievements: function () {
        try {
            var achDiv = null,
                tdDiv  = null;

            achDiv = $("#app46755028429_achievements_2");
            if (achDiv && achDiv.length) {
                tdDiv = achDiv.find("td div");
                if (tdDiv && tdDiv.length === 6) {
                    this.stats.achievements.battle.invasions.won = this.NumberOnly(tdDiv.eq(0).text());
                    this.stats.achievements.battle.duels.won = this.NumberOnly(tdDiv.eq(1).text());
                    this.stats.achievements.battle.invasions.lost = this.NumberOnly(tdDiv.eq(2).text());
                    this.stats.achievements.battle.duels.lost = this.NumberOnly(tdDiv.eq(3).text());
                    this.stats.achievements.battle.invasions.streak = parseInt(tdDiv.eq(4).text(), 10);
                    this.stats.achievements.battle.duels.streak = parseInt(tdDiv.eq(5).text(), 10);
                    if (this.stats.achievements.battle.invasions.lost) {
                        this.stats.achievements.battle.invasions.ratio = this.stats.achievements.battle.invasions.won / this.stats.achievements.battle.invasions.lost;
                    } else {
                        this.stats.achievements.battle.invasions.ratio = Infinity;
                    }

                    if (this.stats.achievements.battle.invasions.lost) {
                        this.stats.achievements.battle.duels.ratio = this.stats.achievements.battle.duels.won / this.stats.achievements.battle.duels.lost;
                    } else {
                        this.stats.achievements.battle.duels.ratio = Infinity;
                    }
                }
            } else {
                global.log(1, 'Battle Achievements not found.');
            }

            achDiv = $("#app46755028429_achievements_3");
            if (achDiv && achDiv.length) {
                tdDiv = achDiv.find("td div");
                if (tdDiv && tdDiv.length === 11) {
                    this.stats.achievements.monster.gildamesh = this.NumberOnly(tdDiv.eq(0).text());
                    this.stats.achievements.monster.lotus = this.NumberOnly(tdDiv.eq(1).text());
                    this.stats.achievements.monster.colossus = this.NumberOnly(tdDiv.eq(2).text());
                    this.stats.achievements.monster.dragons = this.NumberOnly(tdDiv.eq(3).text());
                    this.stats.achievements.monster.sylvanas = this.NumberOnly(tdDiv.eq(4).text());
                    this.stats.achievements.monster.cronus = this.NumberOnly(tdDiv.eq(5).text());
                    this.stats.achievements.monster.keira = this.NumberOnly(tdDiv.eq(6).text());
                    this.stats.achievements.monster.sieges = this.NumberOnly(tdDiv.eq(7).text());
                    this.stats.achievements.monster.legion = this.NumberOnly(tdDiv.eq(8).text());
                    this.stats.achievements.monster.genesis = this.NumberOnly(tdDiv.eq(9).text());
                    this.stats.achievements.monster.skaar = this.NumberOnly(tdDiv.eq(10).text());
                }
            } else {
                global.log(1, 'Monster Achievements not found.');
            }

            achDiv = $("#app46755028429_achievements_4");
            if (achDiv && achDiv.length) {
                tdDiv = achDiv.find("td div");
                if (tdDiv && tdDiv.length === 1) {
                    this.stats.achievements.other.alchemy = this.NumberOnly(tdDiv.eq(0).text());
                }

                this.SaveStats();
            } else {
                global.log(1, 'Other Achievements not found.');
            }

            schedule.Set("achievements", gm.getNumber("CheckAchievements", 24) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_achievements: " + err);
            return false;
        }
    },

    CheckResults_view_class_progress: function () {
        try {
            var classDiv = null,
                name     = '';

            classDiv = $("#app46755028429_choose_class_screen div[class*='banner_']");
            if (classDiv && classDiv.length === 6) {
                classDiv.each(function (index) {
                    name = $(this).attr("class").replace("banner_", '');
                    if (name && typeof caap.stats.character[name] === 'object') {
                        caap.stats.character[name].name = name.ucFirst();
                        caap.stats.character[name].percent = caap.NumberOnly($(this).find("img[src*='progress']").css("width"));
                        caap.stats.character[name].level = caap.NumberOnly($(this).children().eq(2).text());
                    } else {
                        global.log(1, "Problem character class name", name);
                    }
                });

                this.SaveStats();
            } else {
                global.log(1, "Problem with character class records", classDiv);
            }

            schedule.Set("view_class_progress", gm.getNumber("CheckClassProgress", 48) * 3600, 300);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_view_class_progress: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          QUESTING
    // Quest function does action, DrawQuest sets up the page and gathers info
    /////////////////////////////////////////////////////////////////////

    MaxEnergyQuest: function () {
        if (!gm.getValue('MaxIdleEnergy', 0)) {
            global.log(1, "Changing to idle general to get Max energy");
            return this.PassiveGeneral();
        }

        if (this.stats.energy.num >= gm.getValue('MaxIdleEnergy')) {
            return this.Quests();
        }

        return false;
    },

    baseQuestTable : {
        'Land of Fire'      : 'land_fire',
        'Land of Earth'     : 'land_earth',
        'Land of Mist'      : 'land_mist',
        'Land of Water'     : 'land_water',
        'Demon Realm'       : 'land_demon_realm',
        'Undead Realm'      : 'land_undead_realm',
        'Underworld'        : 'tab_underworld',
        'Kingdom of Heaven' : 'tab_heaven',
        'Ivory City'        : 'tab_ivory'
    },

    demiQuestTable : {
        'Ambrosia'    : 'energy',
        'Malekus'     : 'attack',
        'Corvintheus' : 'defense',
        'Aurora'      : 'health',
        'Azeron'      : 'stamina'
    },

    Quests: function () {
        try {
            if (gm.getValue('storeRetrieve', '') !== '') {
                if (gm.getValue('storeRetrieve') === 'general') {
                    if (general.Select('BuyGeneral')) {
                        return true;
                    }

                    gm.setValue('storeRetrieve', '');
                    return true;
                } else {
                    return this.RetrieveFromBank(gm.getValue('storeRetrieve', ''));
                }
            }

            this.SetDivContent('quest_mess', '');
            if (gm.getValue('WhenQuest', '') === 'Never') {
                this.SetDivContent('quest_mess', 'Questing off');
                return false;
            }

            if (gm.getValue('WhenQuest', '') === 'Not Fortifying') {
                var maxHealthtoQuest = gm.getNumber('MaxHealthtoQuest', 0);
                if (!maxHealthtoQuest) {
                    this.SetDivContent('quest_mess', '<b>No valid over fortify %</b>');
                    return false;
                }

                var fortMon = gm.getValue('targetFromfortify', '');
                if (fortMon) {
                    this.SetDivContent('quest_mess', 'No questing until attack target ' + fortMon + " health exceeds " + gm.getNumber('MaxToFortify', 0) + '%');
                    return false;
                }

                var targetFrombattle_monster = gm.getValue('targetFrombattle_monster', '');
                if (!targetFrombattle_monster) {
                    var currentMonster = this.getMonsterRecord(targetFrombattle_monster);
                    var targetFort = currentMonster.fortify;
                    // need to check this - if (!targetFort) {
                    if (!targetFort) {
                        if (targetFort < maxHealthtoQuest) {
                            this.SetDivContent('quest_mess', 'No questing until fortify target ' + targetFrombattle_monster + ' health exceeds ' + maxHealthtoQuest + '%');
                            return false;
                        }
                    }
                }
            }

            if (!gm.getObjVal('AutoQuest', 'name')) {
                if (gm.getValue('WhyQuest', '') === 'Manual') {
                    this.SetDivContent('quest_mess', 'Pick quest manually.');
                    return false;
                }

                this.SetDivContent('quest_mess', 'Searching for quest.');
                global.log(1, "Searching for quest");
            } else {
                var energyCheck = this.CheckEnergy(gm.getObjVal('AutoQuest', 'energy'), gm.getValue('WhenQuest', 'Never'), 'quest_mess');
                if (!energyCheck) {
                    return false;
                }
            }

            if (gm.getObjVal('AutoQuest', 'general') === 'none' || gm.getValue('ForceSubGeneral')) {
                if (general.Select('SubQuestGeneral')) {
                    return true;
                }
            }

            if (gm.getValue('LevelUpGeneral', 'Use Current') !== 'Use Current' &&
                    gm.getValue('QuestLevelUpGeneral', false) &&
                    this.stats.exp.dif &&
                    this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                if (general.Select('LevelUpGeneral')) {
                    return true;
                }

                global.log(1, 'Using level up general');
            }

            switch (gm.getValue('QuestArea', 'Quest')) {
            case 'Quest' :
                var subQArea = gm.getValue('QuestSubArea', 'Land of Fire');
                var landPic = this.baseQuestTable[subQArea];
                var imgExist = false;
                if (landPic === 'tab_underworld' || landPic === 'tab_ivory') {
                    imgExist = this.NavigateTo('quests,jobs_tab_more.gif,' + landPic + '_small.gif', landPic + '_big');
                } else if (landPic === 'tab_heaven') {
                    imgExist = this.NavigateTo('quests,jobs_tab_more.gif,' + landPic + '_small2.gif', landPic + '_big2.gif');
                } else if ((landPic === 'land_demon_realm') || (landPic === 'land_undead_realm')) {
                    imgExist = this.NavigateTo('quests,jobs_tab_more.gif,' + landPic + '.gif', landPic + '_sel');
                } else {
                    imgExist = this.NavigateTo('quests,jobs_tab_back.gif,' + landPic + '.gif', landPic + '_sel');
                }

                if (imgExist) {
                    return true;
                }

                break;
            case 'Demi Quests' :
                if (this.NavigateTo('quests,symbolquests', 'demi_quest_on.gif')) {
                    return true;
                }

                var subDQArea = gm.getValue('QuestSubArea', 'Ambrosia');
                var picSlice = nHtml.FindByAttrContains(document.body, 'img', 'src', 'deity_' + this.demiQuestTable[subDQArea]);
                if (picSlice.style.height !== '160px') {
                    return this.NavigateTo('deity_' + this.demiQuestTable[subDQArea]);
                }

                break;
            case 'Atlantis' :
                if (!this.CheckForImage('tab_atlantis_on.gif')) {
                    return this.NavigateTo('quests,monster_quests');
                }

                break;
            default :
            }

            var button = this.CheckForImage('quick_switch_button.gif');
            if (button && !gm.getValue('ForceSubGeneral', false)) {
                if (gm.getValue('LevelUpGeneral', 'Use Current') !== 'Use Current' &&
                    gm.getValue('QuestLevelUpGeneral', false) &&
                    this.stats.exp.dif &&
                    this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                    if (general.Select('LevelUpGeneral')) {
                        return true;
                    }

                    global.log(1, 'Using level up general');
                } else {
                    global.log(1, 'Clicking on quick switch general button.');
                    this.Click(button);
                    general.quickSwitch = true;
                    return true;
                }
            }

            if (general.quickSwitch) {
                general.GetEquippedStats();
            }

            var costToBuy = '';
            //Buy quest requires popup
            var itemBuyPopUp = nHtml.FindByAttrContains(document.body, "form", "id", 'itemBuy');
            if (itemBuyPopUp) {
                gm.setValue('storeRetrieve', 'general');
                if (general.Select('BuyGeneral')) {
                    return true;
                }

                gm.setValue('storeRetrieve', '');
                costToBuy = itemBuyPopUp.textContent.replace(new RegExp(".*\\$"), '').replace(new RegExp("[^0-9]{3,}.*"), '');
                global.log(1, "costToBuy", costToBuy);
                if (this.stats.gold.cash < costToBuy) {
                    //Retrieving from Bank
                    if (this.stats.gold.cash + (this.stats.gold.bank - gm.getNumber('minInStore', 0)) >= costToBuy) {
                        global.log(1, "Trying to retrieve", costToBuy - this.stats.gold.cash);
                        gm.setValue("storeRetrieve", costToBuy - this.stats.gold.cash);
                        return this.RetrieveFromBank(costToBuy - this.stats.gold.cash);
                    } else {
                        gm.setValue('AutoQuest', '');
                        gm.setValue('WhyQuest', 'Manual');
                        global.log(1, "Cant buy requires, stopping quest");
                        this.ManualAutoQuest();
                        return false;
                    }
                }

                button = this.CheckForImage('quick_buy_button.jpg');
                if (button) {
                    global.log(1, 'Clicking on quick buy button.');
                    this.Click(button);
                    return true;
                }

                global.log(1, "Cant find buy button");
                return false;
            }

            button = this.CheckForImage('quick_buy_button.jpg');
            if (button) {
                gm.setValue('storeRetrieve', 'general');
                if (general.Select('BuyGeneral')) {
                    return true;
                }

                gm.setValue('storeRetrieve', '');
                costToBuy = button.previousElementSibling.previousElementSibling.previousElementSibling
                    .previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling
                    .firstChild.data.replace(new RegExp("[^0-9]", "g"), '');
                global.log(1, "costToBuy", costToBuy);
                if (this.stats.gold.cash < costToBuy) {
                    //Retrieving from Bank
                    if (this.stats.gold.cash + (this.stats.gold.bank - gm.getNumber('minInStore', 0)) >= costToBuy) {
                        global.log(1, "Trying to retrieve", costToBuy - this.stats.gold.cash);
                        gm.setValue("storeRetrieve", costToBuy - this.stats.gold.cash);
                        return this.RetrieveFromBank(costToBuy - this.stats.gold.cash);
                    } else {
                        gm.setValue('AutoQuest', '');
                        gm.setValue('WhyQuest', 'Manual');
                        global.log(1, "Cant buy General, stopping quest");
                        this.ManualAutoQuest();
                        return false;
                    }
                }

                global.log(1, 'Clicking on quick buy general button.');
                this.Click(button);
                return true;
            }

            var autoQuestDivs = this.CheckResults_quests(true);
            if (!gm.getObjVal('AutoQuest', 'name')) {
                global.log(1, 'Could not find AutoQuest.');
                this.SetDivContent('quest_mess', 'Could not find AutoQuest.');
                return false;
            }

            var autoQuestName = gm.getObjVal('AutoQuest', 'name');
            if (gm.getObjVal('AutoQuest', 'name') !== autoQuestName) {
                global.log(1, 'New AutoQuest found.');
                this.SetDivContent('quest_mess', 'New AutoQuest found.');
                return true;
            }

            // if found missing requires, click to buy
            if (autoQuestDivs.tr !== undefined) {
                if (gm.getValue('QuestSubArea', 'Atlantis') === 'Atlantis') {
                    gm.setValue('AutoQuest', '');
                    gm.setValue('WhyQuest', 'Manual');
                    global.log(1, "Cant buy Atlantis items, stopping quest");
                    this.ManualAutoQuest();
                    return false;
                }

                var background = nHtml.FindByAttrContains(autoQuestDivs.tr, "div", "style", 'background-color');
                if (background) {
                    if (background.style.backgroundColor === 'rgb(158, 11, 15)') {
                        global.log(1, " background.style.backgroundColor", background.style.backgroundColor);
                        gm.setValue('storeRetrieve', 'general');
                        if (general.Select('BuyGeneral')) {
                            return true;
                        }

                        gm.setValue('storeRetrieve', '');
                        if (background.firstChild.firstChild.title) {
                            global.log(1, "Clicking to buy", background.firstChild.firstChild.title);
                            this.Click(background.firstChild.firstChild);
                            return true;
                        }
                    }
                }
            } else {
                global.log(1, 'Can not buy quest item');
                return false;
            }

            var questGeneral = gm.getObjVal('AutoQuest', 'general');
            if (questGeneral === 'none' || gm.getValue('ForceSubGeneral', false)) {
                if (general.Select('SubQuestGeneral')) {
                    return true;
                }
            } else if ((questGeneral) && questGeneral !== general.GetCurrent()) {
                if (gm.getValue('LevelUpGeneral', 'Use Current') !== 'Use Current' &&
                        gm.getValue('QuestLevelUpGeneral', false) && this.stats.exp.dif &&
                        this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                    if (general.Select('LevelUpGeneral')) {
                        return true;
                    }

                    global.log(1, 'Using level up general');
                } else {
                    if (autoQuestDivs.genDiv !== undefined) {
                        global.log(1, 'Clicking on general', questGeneral);
                        this.Click(autoQuestDivs.genDiv);
                        return true;
                    } else {
                        global.log(1, 'Can not click on general', questGeneral);
                        return false;
                    }
                }
            }

            if (autoQuestDivs.click !== undefined) {
                global.log(1, 'Clicking auto quest', autoQuestName);
                gm.setValue('ReleaseControl', true);
                this.Click(autoQuestDivs.click, 10000);
                //global.log(1, "Quests: " + autoQuestName + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
                this.ShowAutoQuest();
                return true;
            } else {
                global.log(1, 'Can not click auto quest', autoQuestName);
                return false;
            }
        } catch (err) {
            global.error("ERROR in Quests: " + err);
            return false;
        }
    },

    questName: null,

    QuestManually: function () {
        global.log(1, "QuestManually: Setting manual quest options");
        gm.setValue('AutoQuest', '');
        gm.setValue('WhyQuest', 'Manual');
        this.ManualAutoQuest();
    },

    UpdateQuestGUI: function () {
        global.log(1, "UpdateQuestGUI: Setting drop down menus");
        this.SelectDropOption('QuestArea', gm.getValue('QuestArea'));
        this.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
    },

    CheckResults_symbolquests: function () {
        try {
            var demiDiv = null,
                points  = [],
                success = true;

            demiDiv = $("div[id*='app46755028429_symbol_desc_symbolquests']");
            if (demiDiv && demiDiv.length === 5) {
                demiDiv.each(function (index) {
                    var temp = caap.NumberOnly($(this).children().next().eq(1).children().children().next().text());
                    if (temp && typeof temp === 'number') {
                        points.push(temp);
                    } else {
                        success = false;
                        global.log(1, 'Demi-Power temp text problem', temp);
                    }
                });

                global.log(2, 'Points', points);
                if (success) {
                    this.demi.ambrosia.power.total = points[0];
                    this.demi.malekus.power.total = points[1];
                    this.demi.corvintheus.power.total = points[2];
                    this.demi.aurora.power.total = points[3];
                    this.demi.azeron.power.total = points[4];
                    schedule.Set("symbolquests", gm.getNumber("CheckSymbolQuests", 24) * 3600, 300);
                    this.SaveDemi();
                }
            } else {
                global.log(1, "Demi demiDiv problem", demiDiv);
            }

            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_symbolquests: " + err);
            return false;
        }
    },

    CheckResults_quests: function (pickQuestTF) {
        try {
            if ($("#app46755028429_quest_map_container").length) {
                var metaQuest = $("div[id*='app46755028429_meta_quest_']");
                if (metaQuest && metaQuest.length) {
                    metaQuest.each(function (index) {
                        if (!$(this).find("img[src*='completed']").length) {
                            $("div[id='app46755028429_quest_wrapper_" + $(this).attr("id").replace("app46755028429_meta_quest_", '') + "']").css("display", "block");
                        }
                    });
                }
            }

            var whyQuest = gm.getValue('WhyQuest', '');
            if (pickQuestTF === true && whyQuest !== 'Manual') {
                gm.setValue('AutoQuest', '');
            }

            var bestReward  = 0,
                rewardRatio = 0,
                div         = document.body,
                ss          = null,
                s           = 0;

            if (this.CheckForImage('demi_quest_on.gif')) {
                this.CheckResults_symbolquests();
                ss = document.evaluate(".//div[contains(@id,'symbol_displaysymbolquest')]",
                    div, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (ss.snapshotLength <= 0) {
                    global.log(1, "Failed to find symbol_displaysymbolquest");
                }

                for (s = 0; s < ss.snapshotLength; s += 1) {
                    div = ss.snapshotItem(s);
                    if (div.style.display !== 'none') {
                        break;
                    }
                }
            }

            ss = document.evaluate(".//div[contains(@class,'quests_background')]", div, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (ss.snapshotLength <= 0) {
                global.log(1, "Failed to find quests_background");
                return false;
            }

            var bossList = [
                    "Heart of Fire",
                    "Gift of Earth",
                    "Eye of the Storm",
                    "A Look into the Darkness",
                    "The Rift",
                    "Undead Embrace",
                    "Confrontation",
                    "Archangels Wrath",
                    "Entrance to the Throne"
                ],
                haveOrb  = false;

            if (nHtml.FindByAttrContains(div, 'input', 'src', 'alchemy_summon')) {
                haveOrb = true;
                if (bossList.indexOf(gm.getObjVal('AutoQuest', 'name')) >= 0 && gm.getValue('GetOrbs', false) && whyQuest !== 'Manual') {
                    gm.setValue('AutoQuest', '');
                }
            }

            var autoQuestDivs = {
                'click' : undefined,
                'tr'    : undefined,
                'genDiv': undefined
            };

            for (s = 0; s < ss.snapshotLength; s += 1) {
                div = ss.snapshotItem(s);
                this.questName = this.GetQuestName(div);
                if (!this.questName) {
                    continue;
                }

                var reward     = null,
                    energy     = null,
                    experience = null,
                    divTxt     = nHtml.GetText(div),
                    expM       = divTxt.match(new RegExp("\\+([0-9]+)"));

                if (expM && expM.length === 2) {
                    experience = this.NumberOnly(expM[1]);
                } else {
                    var expObj = $("div[class='quest_experience']");
                    if (expObj && expObj.length) {
                        experience = this.NumberOnly(expObj.text());
                    } else {
                        global.log(1, "Can't find experience for", this.questName);
                    }
                }

                var idx = this.questName.indexOf('<br>');
                if (idx >= 0) {
                    this.questName = this.questName.substring(0, idx);
                }

                var energyM = divTxt.match(new RegExp("([0-9]+)\\s+energy", "i"));
                if (energyM && energyM.length === 2) {
                    energy = this.NumberOnly(energyM[1]);
                } else {
                    var eObj = nHtml.FindByAttrContains(div, 'div', 'className', 'quest_req');
                    if (eObj) {
                        energy = eObj.getElementsByTagName('b')[0];
                    }
                }

                if (!energy) {
                    global.log(1, "Can't find energy for", this.questName);
                    continue;
                }

                var moneyM     = this.RemoveHtmlJunk(divTxt).match(new RegExp("\\$([0-9,]+)\\s*-\\s*\\$([0-9,]+)", "i")),
                    rewardLow  = 0,
                    rewardHigh = 0;

                if (moneyM && moneyM.length === 3) {
                    rewardLow  = this.NumberOnly(moneyM[1]);
                    rewardHigh = this.NumberOnly(moneyM[2]);
                    reward = (rewardLow + rewardHigh) / 2;
                } else {
                    moneyM = this.RemoveHtmlJunk(divTxt).match(new RegExp("\\$([0-9,]+)mil\\s*-\\s*\\$([0-9,]+)mil", "i"));
                    if (moneyM && moneyM.length === 3) {
                        rewardLow  = this.NumberOnly(moneyM[1]) * 1000000;
                        rewardHigh = this.NumberOnly(moneyM[2]) * 1000000;
                        reward = (rewardLow + rewardHigh) / 2;
                    } else {
                        global.log(1, 'No money found for', this.questName, divTxt);
                    }
                }

                var click = $(div).find("input[name*='Do']").get(0);
                if (!click) {
                    global.log(1, 'No button found for', this.questName);
                    continue;
                }

                var influence = null;
                if (bossList.indexOf(this.questName) >= 0) {
                    if ($("div[class='quests_background_sub']").length) {
                        //if boss and found sub quests
                        influence = "100";
                    } else {
                        influence = "0";
                    }
                } else {
                    var influenceList = divTxt.match(new RegExp("([0-9]+)%"));
                    if (influenceList && influenceList.length === 2) {
                        influence = influenceList[1];
                    } else {
                        global.log(1, "Influence div not found.", influenceList);
                    }
                }

                if (!influence) {
                    global.log(1, 'No influence found for', this.questName, divTxt);
                }

                var general = 'none';
                var genDiv = null;
                if (influence && influence < 100) {
                    genDiv = nHtml.FindByAttrContains(div, 'div', 'className', 'quest_act_gen');
                    if (genDiv) {
                        genDiv = nHtml.FindByAttrContains(genDiv, 'img', 'src', 'jpg');
                        if (genDiv) {
                            general = genDiv.title;
                        }
                    }
                }

                var questType = 'subquest';
                if (div.className === 'quests_background') {
                    questType = 'primary';
                } else if (div.className === 'quests_background_special') {
                    questType = 'boss';
                }

                if (s === 0) {
                    global.log(1, "Adding Quest Labels and Listeners");
                }

                this.LabelQuests(div, energy, reward, experience, click);
                //global.log(1, gm.getValue('QuestSubArea', 'Atlantis'));
                if (this.CheckCurrentQuestArea(gm.getValue('QuestSubArea', 'Atlantis'))) {
                    if (gm.getValue('GetOrbs', false) && questType === 'boss' && whyQuest !== 'Manual') {
                        if (!haveOrb) {
                            gm.setObjVal('AutoQuest', 'name', this.questName);
                            pickQuestTF = true;
                        }
                    }

                    switch (whyQuest) {
                    case 'Advancement' :
                        if (influence) {
                            if (!gm.getObjVal('AutoQuest', 'name') && questType === 'primary' && this.NumberOnly(influence) < 100) {
                                gm.setObjVal('AutoQuest', 'name', this.questName);
                                pickQuestTF = true;
                            }
                        } else {
                            global.log(1, "Can't find influence for", this.questName, influence);
                        }

                        break;
                    case 'Max Influence' :
                        if (influence) {
                            if (!gm.getObjVal('AutoQuest', 'name') && this.NumberOnly(influence) < 100) {
                                gm.setObjVal('AutoQuest', 'name', this.questName);
                                pickQuestTF = true;
                            }
                        } else {
                            global.log(1, "Can't find influence for", this.questName, influence);
                        }

                        break;
                    case 'Max Experience' :
                        rewardRatio = (Math.floor(experience / energy * 100) / 100);
                        if (bestReward < rewardRatio) {
                            gm.setObjVal('AutoQuest', 'name', this.questName);
                            pickQuestTF = true;
                        }

                        break;
                    case 'Max Gold' :
                        rewardRatio = (Math.floor(reward / energy * 10) / 10);
                        if (bestReward < rewardRatio) {
                            gm.setObjVal('AutoQuest', 'name', this.questName);
                            pickQuestTF = true;
                        }

                        break;
                    default :
                    }

                    if (gm.getObjVal('AutoQuest', 'name') === this.questName) {
                        bestReward = rewardRatio;
                        var expRatio = experience / energy;
                        global.log(1, "Setting AutoQuest", this.questName);
                        gm.setValue('AutoQuest', 'name' + global.ls + this.questName + global.vs + 'energy' + global.ls + energy + global.vs + 'general' + global.ls + general + global.vs + 'expRatio' + global.ls + expRatio);
                        global.log(9, "CheckResults_quests", gm.getValue('AutoQuest'));
                        this.ShowAutoQuest();
                        autoQuestDivs.click  = click;
                        autoQuestDivs.tr     = div;
                        autoQuestDivs.genDiv = genDiv;
                    }
                }
            }

            if (pickQuestTF) {
                if (gm.getObjVal('AutoQuest', 'name')) {
                    global.log(9, "CheckResults_quests(pickQuestTF)", gm.getValue('AutoQuest'));
                    this.ShowAutoQuest();
                    return autoQuestDivs;
                }

                //if not find quest, probably you already maxed the subarea, try another area
                if ((whyQuest === 'Max Influence' || whyQuest === 'Advancement') && gm.getValue('switchQuestArea', false)) {
                    global.log(9, "QuestSubArea", gm.getValue('QuestSubArea'));
                    switch (gm.getValue('QuestSubArea')) {
                    case 'Land of Fire':
                        gm.setValue('QuestSubArea', 'Land of Earth');
                        break;
                    case 'Land of Earth':
                        gm.setValue('QuestSubArea', 'Land of Mist');
                        break;
                    case 'Land of Mist':
                        gm.setValue('QuestSubArea', 'Land of Water');
                        break;
                    case 'Land of Water':
                        gm.setValue('QuestSubArea', 'Demon Realm');
                        break;
                    case 'Demon Realm':
                        gm.setValue('QuestSubArea', 'Undead Realm');
                        break;
                    case 'Undead Realm':
                        gm.setValue('QuestSubArea', 'Underworld');
                        break;
                    case 'Underworld':
                        gm.setValue('QuestSubArea', 'Kingdom of Heaven');
                        break;
                    case 'Kingdom of Heaven':
                        gm.setValue('QuestSubArea', 'Ivory City');
                        break;
                    case 'Ivory City':
                        gm.setValue('QuestArea', 'Demi Quests');
                        gm.setValue('QuestSubArea', 'Ambrosia');
                        this.ChangeDropDownList('QuestSubArea', this.demiQuestList);
                        break;
                    case 'Ambrosia':
                        gm.setValue('QuestSubArea', 'Malekus');
                        break;
                    case 'Malekus':
                        gm.setValue('QuestSubArea', 'Corvintheus');
                        break;
                    case 'Corvintheus':
                        gm.setValue('QuestSubArea', 'Aurora');
                        break;
                    case 'Aurora':
                        gm.setValue('QuestSubArea', 'Azeron');
                        break;
                    case 'Azeron':
                        gm.setValue('QuestArea', 'Atlantis');
                        gm.setValue('QuestSubArea', 'Atlantis');
                        this.ChangeDropDownList('QuestSubArea', this.atlantisQuestList);
                        break;
                    case 'Atlantis':
                        global.log(1, "Final QuestSubArea", gm.getValue('QuestSubArea'));
                        this.QuestManually();
                        break;
                    default :
                        global.log(1, "Unknown QuestSubArea", gm.getValue('QuestSubArea'));
                        this.QuestManually();
                    }

                    this.UpdateQuestGUI();
                    return false;
                }

                global.log(1, "Finished QuestArea.");
                this.QuestManually();
                return false;
            }

            return false;
        } catch (err) {
            global.error("ERROR in CheckResults_quests: " + err);
            this.QuestManually();
            return false;
        }
    },

    CheckCurrentQuestArea: function (QuestSubArea) {
        try {
            switch (QuestSubArea) {
            case 'Land of Fire':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_1')) {
                    return true;
                }

                break;
            case 'Land of Earth':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_2')) {
                    return true;
                }

                break;
            case 'Land of Mist':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_3')) {
                    return true;
                }

                break;
            case 'Land of Water':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_4')) {
                    return true;
                }

                break;
            case 'Demon Realm':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_5')) {
                    return true;
                }

                break;
            case 'Undead Realm':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_6')) {
                    return true;
                }

                break;
            case 'Underworld':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_7')) {
                    return true;
                }

                break;
            case 'Kingdom of Heaven':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_8')) {
                    return true;
                }

                break;
            case 'Ivory City':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_9')) {
                    return true;
                }

                break;
            case 'Ambrosia':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_1')) {
                    return true;
                }

                break;
            case 'Malekus':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_2')) {
                    return true;
                }

                break;
            case 'Corvintheus':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_3')) {
                    return true;
                }

                break;
            case 'Aurora':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_4')) {
                    return true;
                }

                break;
            case 'Azeron':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_5')) {
                    return true;
                }

                break;
            case 'Atlantis':
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'monster_quests_stage_1')) {
                    return true;
                }

                break;
            default :
                global.log(1, "Can't find QuestSubArea", QuestSubArea);
            }

            return false;
        } catch (err) {
            global.error("ERROR in CheckCurrentQuestArea: " + err);
            return false;
        }
    },

    GetQuestName: function (questDiv) {
        try {
            var item_title = nHtml.FindByAttrXPath(questDiv, 'div', "@class='quest_desc' or @class='quest_sub_title'");
            if (!item_title) {
                global.log(2, "Can't find quest description or sub-title");
                return false;
            }

            if (item_title.innerHTML.toString().match(/LOCK/)) {
                global.log(2, "Quest locked", item_title);
                return false;
            }

            var firstb = item_title.getElementsByTagName('b')[0];
            if (!firstb) {
                global.log(1, "Can't get bolded member out of", item_title.innerHTML.toString());
                return false;
            }

            this.questName = $.trim(firstb.innerHTML.toString()).stripHTML();
            if (!this.questName) {
                global.log(1, 'No quest name for this row');
                return false;
            }

            return this.questName;
        } catch (err) {
            global.error("ERROR in GetQuestName: " + err);
            return false;
        }
    },

    /*------------------------------------------------------------------------------------\
    CheckEnergy gets passed the default energy requirement plus the condition text from
    the 'Whenxxxxx' setting and the message div name.
    \------------------------------------------------------------------------------------*/
    CheckEnergy: function (energy, condition, msgdiv) {
        try {
            if (!this.stats.energy || !energy) {
                return false;
            }

            if (condition === 'Energy Available' || condition === 'Not Fortifying') {
                if (this.stats.energy.num >= energy) {
                    return true;
                }

                if (msgdiv) {
                    this.SetDivContent(msgdiv, 'Waiting for more energy: ' + this.stats.energy.num + "/" + (energy ? energy : ""));
                }
            } else if (condition === 'At X Energy') {
                if (this.InLevelUpMode() && this.stats.energy.num >= energy) {
                    if (msgdiv) {
                        this.SetDivContent(msgdiv, 'Burning all energy to level up');
                    }

                    return true;
                }

                if ((this.stats.energy.num >= gm.getValue('XQuestEnergy', 1)) && (this.stats.energy.num >= energy)) {
                    return true;
                }

                if ((this.stats.energy.num >= gm.getValue('XMinQuestEnergy', 0)) && (this.stats.energy.num >= energy)) {
                    return true;
                }

                var whichEnergy = gm.getValue('XQuestEnergy', 1);
                if (energy > whichEnergy) {
                    whichEnergy = energy;
                }

                if (msgdiv) {
                    this.SetDivContent(msgdiv, 'Waiting for more energy:' + this.stats.energy.num + "/" + whichEnergy);
                }
            } else if (condition === 'At Max Energy') {
                if (!gm.getValue('MaxIdleEnergy', 0)) {
                    global.log(1, "Changing to idle general to get Max energy");
                    this.PassiveGeneral();
                }

                if (this.stats.energy.num >= gm.getValue('MaxIdleEnergy')) {
                    return true;
                }

                if (this.InLevelUpMode() && this.stats.energy.num >= energy) {
                    if (msgdiv) {
                        this.SetDivContent(msgdiv, 'Burning all energy to level up');
                    }

                    return true;
                }

                if (msgdiv) {
                    this.SetDivContent(msgdiv, 'Waiting for max energy:' + this.stats.energy.num + "/" + gm.getValue('MaxIdleEnergy'));
                }
            }

            return false;
        } catch (err) {
            global.error("ERROR in CheckEnergy: " + err);
            return false;
        }
    },

    AddLabelListener: function (element, type, listener, usecapture) {
        try {
            element.addEventListener(type, this[listener], usecapture);
            return true;
        } catch (err) {
            global.error("ERROR in AddLabelListener: " + err);
            return false;
        }
    },

    LabelListener: function (e) {
        try {
            var sps = e.target.getElementsByTagName('span');
            if (sps.length <= 0) {
                throw 'what did we click on?';
            }

            gm.setValue('AutoQuest', 'name' + global.ls + sps[0].innerHTML.toString() + global.vs + 'energy' + global.ls + sps[1].innerHTML.toString());
            gm.setValue('WhyQuest', 'Manual');
            caap.ManualAutoQuest();
            if (caap.CheckForImage('tab_quest_on.gif')) {
                gm.setValue('QuestArea', 'Quest');
                caap.SelectDropOption('QuestArea', 'Quest');
                caap.ChangeDropDownList('QuestSubArea', caap.landQuestList);
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_1')) {
                    gm.setValue('QuestSubArea', 'Land of Fire');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_2')) {
                    gm.setValue('QuestSubArea', 'Land of Earth');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_3')) {
                    gm.setValue('QuestSubArea', 'Land of Mist');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_4')) {
                    gm.setValue('QuestSubArea', 'Land of Water');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_5')) {
                    gm.setValue('QuestSubArea', 'Demon Realm');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_6')) {
                    gm.setValue('QuestSubArea', 'Undead Realm');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_7')) {
                    gm.setValue('QuestSubArea', 'Underworld');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_8')) {
                    gm.setValue('QuestSubArea', 'Kingdom of Heaven');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_9')) {
                    gm.setValue('QuestSubArea', 'Ivory City');
                }

                global.log(1, 'Setting QuestSubArea to', gm.getValue('QuestSubArea'));
                caap.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
            } else if (caap.CheckForImage('demi_quest_on.gif')) {
                gm.setValue('QuestArea', 'Demi Quests');
                caap.SelectDropOption('QuestArea', 'Demi Quests');
                caap.ChangeDropDownList('QuestSubArea', caap.demiQuestList);
                // Set Sub Quest Area
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_1')) {
                    gm.setValue('QuestSubArea', 'Ambrosia');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_2')) {
                    gm.setValue('QuestSubArea', 'Malekus');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_3')) {
                    gm.setValue('QuestSubArea', 'Corvintheus');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_4')) {
                    gm.setValue('QuestSubArea', 'Aurora');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_5')) {
                    gm.setValue('QuestSubArea', 'Azeron');
                }

                global.log(1, 'Setting QuestSubArea to', gm.getValue('QuestSubArea'));
                caap.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
            } else if (caap.CheckForImage('tab_atlantis_on.gif')) {
                gm.setValue('QuestArea', 'Atlantis');
                caap.ChangeDropDownList('QuestSubArea', caap.atlantisQuestList);
                // Set Sub Quest Area
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'monster_quests_stage_1')) {
                    gm.setValue('QuestSubArea', 'Atlantis');
                }

                global.log(1, 'Setting QuestSubArea to', gm.getValue('QuestSubArea'));
                caap.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
            }

            caap.ShowAutoQuest();
            return true;
        } catch (err) {
            global.error("ERROR in LabelListener: " + err);
            return false;
        }
    },

    LabelQuests: function (div, energy, reward, experience, click) {
        if ($(div).find("div[class='autoquest'").length) {
            return;
        }

        div = document.createElement('div');
        div.className = 'autoquest';
        div.style.fontSize = '10px';
        div.innerHTML = "$ per energy: " + (Math.floor(reward / energy * 10) / 10) +
            "<br />Exp per energy: " + (Math.floor(experience / energy * 100) / 100) + "<br />";

        if (gm.getObjVal('AutoQuest', 'name') === this.questName) {
            var b = document.createElement('b');
            b.innerHTML = "Current auto quest";
            div.appendChild(b);
        } else {
            var setAutoQuest = document.createElement('a');
            setAutoQuest.innerHTML = 'Auto run this quest.';
            setAutoQuest.quest_name = this.questName;

            var quest_nameObj = document.createElement('span');
            quest_nameObj.innerHTML = this.questName;
            quest_nameObj.style.display = 'none';
            setAutoQuest.appendChild(quest_nameObj);

            var quest_energyObj = document.createElement('span');
            quest_energyObj.innerHTML = energy;
            quest_energyObj.style.display = 'none';
            setAutoQuest.appendChild(quest_energyObj);
            this.AddLabelListener(setAutoQuest, "click", "LabelListener", false);

            div.appendChild(setAutoQuest);
        }

        div.style.position = 'absolute';
        div.style.background = '#B09060';
        div.style.right = "144px";
        click.parentNode.insertBefore(div, click);
    },

    /////////////////////////////////////////////////////////////////////
    //                          AUTO BLESSING
    /////////////////////////////////////////////////////////////////////

    deityTable: {
        energy  : 1,
        attack  : 2,
        defense : 3,
        health  : 4,
        stamina : 5
    },

    BlessingResults: function (resultsText) {
        // Check time until next Oracle Blessing
        if (resultsText.match(/Please come back in: /)) {
            var hours = parseInt(resultsText.match(/ \d+ hour/), 10);
            var minutes = parseInt(resultsText.match(/ \d+ minute/), 10);
            schedule.Set('BlessingTimer', (hours * 60 + minutes) * 60, 300);
            global.log(1, 'Recorded Blessing Time. Scheduling next click!');
        }

        // Recieved Demi Blessing.  Wait 24 hours to try again.
        if (resultsText.match(/You have paid tribute to/)) {
            schedule.Set('BlessingTimer', 86400, 300);
            global.log(1, 'Received blessing. Scheduling next click!');
        }

        this.SetCheckResultsFunction('');
    },

    AutoBless: function () {
        var autoBless = gm.getValue('AutoBless', 'none').toLowerCase();
        if (autoBless === 'none') {
            return false;
        }

        if (!schedule.Check('BlessingTimer')) {
            return false;
        }

        if (this.NavigateTo('quests,demi_quest_off', 'demi_quest_bless')) {
            return true;
        }

        var picSlice = nHtml.FindByAttrContains(document.body, 'img', 'src', 'deity_' + autoBless);
        if (!picSlice) {
            global.log(1, 'No diety pics for deity', autoBless);
            return false;
        }

        if (picSlice.style.height !== '160px') {
            return this.NavigateTo('deity_' + autoBless);
        }

        picSlice = nHtml.FindByAttrContains(document.body, 'form', 'id', '_symbols_form_' + this.deityTable[autoBless]);
        if (!picSlice) {
            global.log(1, 'No form for deity blessing.');
            return false;
        }

        picSlice = this.CheckForImage('demi_quest_bless', picSlice);
        if (!picSlice) {
            global.log(1, 'No image for deity blessing.');
            return false;
        }

        global.log(1, 'Click deity blessing for ', autoBless);
        schedule.Set('BlessingTimer', 3600, 300);
        this.SetCheckResultsFunction('BlessingResults');
        this.Click(picSlice);
        return true;
    },

    /////////////////////////////////////////////////////////////////////
    //                          LAND
    // Displays return on lands and perfom auto purchasing
    /////////////////////////////////////////////////////////////////////

    LandsGetNameFromRow: function (row) {
        // schoolofmagic, etc. <div class=item_title
        var infoDiv = nHtml.FindByAttrXPath(row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')");
        if (!infoDiv) {
            global.log(1, "can't find land_buy_info");
        }

        if (infoDiv.className.indexOf('item_title') >= 0) {
            return $.trim(infoDiv.textContent);
        }

        var strongs = infoDiv.getElementsByTagName('strong');
        if (strongs.length < 1) {
            return null;
        }

        return $.trim(strongs[0].textContent);
    },

    bestLand: {
        land : '',
        roi  : 0
    },

    CheckResults_land: function () {
        if (nHtml.FindByAttrXPath(document, 'div', "contains(@class,'caap_landDone')")) {
            return null;
        }

        gm.deleteValue('BestLandCost');
        this.sellLand = '';
        this.bestLand.roi = 0;
        this.IterateLands(function (land) {
            this.SelectLands(land.row, 2);
            var roi = (parseInt((land.income / land.totalCost) * 240000, 10) / 100);
            var div = null;
            if (!nHtml.FindByAttrXPath(land.row, 'input', "@name='Buy'")) {
                roi = 0;
                // Lets get our max allowed from the land_buy_info div
                div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')");
                var maxText = $.trim(nHtml.GetText(div).match(/:\s+\d+/i).toString());
                var maxAllowed = Number(maxText.replace(/:\s+/, ''));
                // Lets get our owned total from the land_buy_costs div
                div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_costs')");
                var ownedText = $.trim(nHtml.GetText(div).match(/:\s+\d+/i).toString());
                var owned = Number(ownedText.replace(/:\s+/, ''));
                // If we own more than allowed we will set land and selection
                var selection = [1, 5, 10];
                for (var s = 2; s >= 0; s -= 1) {
                    if (owned - maxAllowed >= selection[s]) {
                        this.sellLand = land;
                        this.sellLand.selection = s;
                        break;
                    }
                }
            }

            div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')").getElementsByTagName('strong');
            div[0].innerHTML += " | " + roi + "% per day.";
            if (!land.usedByOther) {
                if (!(this.bestLand.roi || roi === 0) || roi > this.bestLand.roi) {
                    this.bestLand.roi = roi;
                    this.bestLand.land = land;
                    gm.setValue('BestLandCost', this.bestLand.land.cost);
                }
            }
        });

        var bestLandCost = gm.getValue('BestLandCost', '');
        global.log(1, "Best Land Cost", bestLandCost);
        if (!bestLandCost) {
            gm.setValue('BestLandCost', 'none');
        }

        var div = document.createElement('div');
        div.className = 'caap_landDone';
        div.style.display = 'none';
        nHtml.FindByAttrContains(document.body, "tr", "class", 'land_buy_row').appendChild(div);
        return null;
    },

    IterateLands: function (func) {
        var content = document.getElementById('content');
        var ss = document.evaluate(".//tr[contains(@class,'land_buy_row')]", content, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (!ss || (ss.snapshotLength === 0)) {
            global.log(9, "Can't find land_buy_row");
            return null;
        }

        var landByName = {};
        var landNames = [];

        global.log(9, 'forms found', ss.snapshotLength);
        for (var s = 0; s < ss.snapshotLength; s += 1) {
            var row = ss.snapshotItem(s);
            if (!row) {
                continue;
            }

            var name = this.LandsGetNameFromRow(row);
            if (name === null || name === '') {
                global.log(1, "Can't find land name");
                continue;
            }

            var moneyss = document.evaluate(".//*[contains(@class,'gold') or contains(@class,'currency')]", row, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (moneyss.snapshotLength < 2) {
                global.log(1, "Can't find 2 gold instances");
                continue;
            }

            var income = 0;
            var nums = [];
            var numberRe = new RegExp("([0-9,]+)");
            for (var sm = 0; sm < moneyss.snapshotLength; sm += 1) {
                income = moneyss.snapshotItem(sm);
                if (income.className.indexOf('label') >= 0) {
                    income = income.parentNode;
                    var m = numberRe.exec(income.textContent);
                    if (m && m.length >= 2 && m[1].length > 1) {
                        // number must be more than a digit or else it could be a "? required" text
                        income = this.NumberOnly(m[1]);
                    } else {
                        global.log(9, 'Cannot find income for', name, income.textContent);
                        income = 0;
                        continue;
                    }
                } else {
                    income = this.NumberOnly(income.textContent);
                }
                nums.push(income);
            }

            income = nums[0];
            var cost = nums[1];
            if (!income || !cost) {
                global.log(1, "Can't find income or cost for", name);
                continue;
            }

            if (income > cost) {
                // income is always less than the cost of land.
                income = nums[1];
                cost = nums[0];
            }

            var totalCost = cost;
            var land = {
                'row'         : row,
                'name'        : name,
                'income'      : income,
                'cost'        : cost,
                'totalCost'   : totalCost,
                'usedByOther' : false
            };

            landByName[name] = land;
            landNames.push(name);
        }

        for (var p = 0; p < landNames.length; p += 1) {
            func.call(this, landByName[landNames[p]]);
        }

        return landByName;
    },

    SelectLands: function (row, val) {
        var selects = row.getElementsByTagName('select');
        if (selects.length < 1) {
            return false;
        }

        var select = selects[0];
        select.selectedIndex = val;
        return true;
    },

    BuyLand: function (land) {
        this.SelectLands(land.row, 2);
        var button = nHtml.FindByAttrXPath(land.row, 'input', "@type='submit' or @type='image'");
        if (button) {
            global.log(9, "Clicking buy button", button);
            global.log(1, "Buying Land", land.name);
            this.Click(button, 13000);
            gm.deleteValue('BestLandCost');
            this.bestLand.roi = 0;
            return true;
        }

        return false;
    },

    SellLand: function (land, select) {
        this.SelectLands(land.row, select);
        var button = nHtml.FindByAttrXPath(land.row, 'input', "@type='submit' or @type='image'");
        if (button) {
            global.log(9, "Clicking sell button", button);
            global.log(1, "Selling Land", land.name);
            this.Click(button, 13000);
            this.sellLand = '';
            return true;
        }

        return false;
    },

    Lands: function () {
        if (gm.getValue('autoBuyLand', false)) {
            // Do we have lands above our max to sell?
            if (this.sellLand && gm.getValue('SellLands', false)) {
                this.SellLand(this.sellLand, this.sellLand.selection);
                return true;
            }

            var bestLandCost = gm.getValue('BestLandCost', '');
            if (!bestLandCost) {
                global.log(1, "Going to land to get Best Land Cost");
                if (this.NavigateTo('soldiers,land', 'tab_land_on.gif')) {
                    return true;
                }
            }

            if (bestLandCost === 'none') {
                global.log(2, "No Lands avaliable");
                return false;
            }

            global.log(2, "Lands: How much gold in store?", this.stats.gold.bank);
            if (!this.stats.gold.bank && this.stats.gold.bank !== 0) {
                global.log(1, "Going to keep to get Stored Value");
                if (this.NavigateTo('keep')) {
                    return true;
                }
            }

            // Retrieving from Bank
            var cashTotAvail = this.stats.gold.cash + (this.stats.gold.bank - gm.getNumber('minInStore', 0));
            var cashNeed = 10 * bestLandCost;
            if ((cashTotAvail >= cashNeed) && (this.stats.gold.cash < cashNeed)) {
                if (this.PassiveGeneral()) {
                    return true;
                }

                global.log(1, "Trying to retrieve", 10 * bestLandCost - this.stats.gold.cash);
                return this.RetrieveFromBank(10 * bestLandCost - this.stats.gold.cash);
            }

            // Need to check for enough moneys + do we have enough of the builton type that we already own.
            if (bestLandCost && this.stats.gold.cash >= 10 * bestLandCost) {
                if (this.PassiveGeneral()) {
                    return true;
                }

                this.NavigateTo('soldiers,land');
                if (this.CheckForImage('tab_land_on.gif')) {
                    global.log(2, "Buying land", this.bestLand.land.name);
                    if (this.BuyLand(this.bestLand.land)) {
                        return true;
                    }
                } else {
                    return this.NavigateTo('soldiers,land');
                }
            }
        }

        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                          BATTLING PLAYERS
    /////////////////////////////////////////////////////////////////////

    CheckBattleResults: function () {
        try {
            var nameLink = null,
                userId = null,
                userName = null,
                now = null,
                newelement = null;

            // Check for Battle results
            var resultsDiv = nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body');
            if (resultsDiv) {
                var resultsText = $.trim(nHtml.GetText(resultsDiv));
                if (resultsText.match(/Your opponent is dead or too weak to battle/)) {
                    global.log(1, "This opponent is dead or hiding: " + this.lastBattleID);
                    if (!this.doNotBattle) {
                        this.doNotBattle = this.lastBattleID;
                    } else {
                        this.doNotBattle += " " + this.lastBattleID;
                    }
                }
            }

            if (nHtml.FindByAttrContains(document.body, "img", "src", 'battle_victory.gif')) {
                var winresults = null,
                    bptxt = '',
                    bpnum = 0,
                    goldtxt = '',
                    goldnum = 0,
                    wins = 1;

                if (gm.getValue("BattleType", "Invade") === "War") {
                    winresults = nHtml.FindByAttrContains(document.body, "b", "class", 'gold');
                    bptxt = $.trim(nHtml.GetText(winresults.parentNode.parentNode).toString());
                    bpnum = ((/\d+\s+War Points/i.test(bptxt)) ? this.NumberOnly(bptxt.match(/\d+\s+War Points/i)) : 0);
                    goldtxt = winresults.innerHTML;
                    goldnum = Number(goldtxt.substring(1).replace(/,/, ''));
                    userId = this.lastBattleID;
                    userName = $("div[style*='war_win_left.jpg']").text().match(new RegExp("(.+)'s Defense"))[1];
                } else {
                    winresults = nHtml.FindByAttrContains(document.body, 'span', 'class', 'positive');
                    bptxt = $.trim(nHtml.GetText(winresults.parentNode).toString());
                    bpnum = ((/\d+\s+Battle Points/i.test(bptxt)) ? this.NumberOnly(bptxt.match(/\d+\s+Battle Points/i)) : 0);
                    goldtxt = nHtml.FindByAttrContains(document.body, "b", "class", 'gold').innerHTML;
                    goldnum = Number(goldtxt.substring(1).replace(/,/, ''));
                    resultsDiv = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app_body');
                    nameLink = nHtml.FindByAttrContains(resultsDiv.parentNode.parentNode, "a", "href", "keep.php?casuser=");
                    userId = nameLink.href.match(/user=\d+/i);
                    userId = String(userId).substr(5);
                    userName = $.trim(nHtml.GetText(nameLink));
                }

                global.log(1, "We Defeated " + userName + "!!");
                //Test if we should chain this guy
                gm.setValue("BattleChainId", '');
                var chainBP = gm.getValue('ChainBP', 'empty');
                if (chainBP !== 'empty') {
                    if (bpnum >= Number(chainBP)) {
                        gm.setValue("BattleChainId", userId);
                        if (gm.getValue("BattleType", "Invade") === "War") {
                            global.log(1, "Chain Attack: " + userId + "  War Points:" + bpnum);
                        } else {
                            global.log(1, "Chain Attack: " + userId + "  Battle Points:" + bpnum);
                        }
                    } else {
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }
                    }
                }

                var chainGold = gm.getNumber('ChainGold', 0);
                if (chainGold) {
                    if (goldnum >= chainGold) {
                        gm.setValue("BattleChainId", userId);
                        global.log(1, "Chain Attack " + userId + " Gold:" + goldnum);
                    } else {
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }
                    }
                }

                if (gm.getValue("BattleChainId", '')) {
                    var chainCount = gm.getNumber('ChainCount', 0) + 1;
                    if (chainCount >= gm.getNumber('MaxChains', 4)) {
                        global.log(1, "Lets give this guy a break.");
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }

                        gm.setValue("BattleChainId", '');
                        chainCount = 0;
                    }

                    gm.setValue('ChainCount', chainCount);
                } else {
                    gm.setValue('ChainCount', 0);
                }

                if (gm.getValue('BattlesWonList', '').indexOf(global.vs + userId + global.vs) === -1 &&
                    (bpnum >= gm.getValue('ReconBPWon', 0) || (goldnum >= gm.getValue('ReconGoldWon', 0)))) {
                    now = (new Date().getTime()).toString();
                    newelement = now + global.vs + userId + global.vs + userName + global.vs + wins + global.vs + bpnum + global.vs + goldnum;
                    gm.listPush('BattlesWonList', newelement, 100);
                }

                this.SetCheckResultsFunction('');
            } else if (this.CheckForImage('battle_defeat.gif')) {
                if (gm.getValue("BattleType", "Invade") === "War") {
                    userId = this.lastBattleID;
                    userName = $("div[style*='war_lose_left.jpg']").text().match(new RegExp("(.+)'s Defense"))[1];
                } else {
                    resultsDiv = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app_body');
                    nameLink = nHtml.FindByAttrContains(resultsDiv.parentNode.parentNode, "a", "href", "keep.php?casuser=");
                    userId = nameLink.href.match(/user=\d+/i);
                    userId = String(userId).substr(5);
                    userName = $.trim(nHtml.GetText(nameLink));
                }

                global.log(1, "We Were Defeated By " + userName + ".");
                gm.setValue('ChainCount', 0);
                if (gm.getValue('BattlesLostList', '').indexOf(global.vs + userId + global.vs) === -1) {
                    now = (new Date().getTime()).toString();
                    newelement = now + global.vs + userId + global.vs + userName;
                    if (!gm.getValue('IgnoreBattleLoss', false)) {
                        gm.listPush('BattlesLostList', newelement, 100);
                    }
                }

                this.SetCheckResultsFunction('');
            } else {
                gm.setValue('ChainCount', 0);
            }
        } catch (err) {
            global.error("ERROR in CheckBattleResults: " + err);
        }
    },

    hashThisId: function (userid) {
        if (!gm.getValue('AllowProtected', true)) {
            return false;
        }

        var sum = 0;
        for (var i = 0; i < userid.length; i += 1) {
            sum += +userid.charAt(i);
        }

        var hash = sum * userid;
        return (global.hashStr.indexOf(hash.toString()) >= 0);
    },

    BattleUserId: function (userid) {
        if (this.hashThisId(userid)) {
            return true;
        }

        var target = '';
        if (gm.getValue('BattleType', 'Invade') === "War") {
            target = this.battles.Freshmeat.War;
        } else if (gm.getValue('BattleType', 'Invade') === "Duel") {
            target = this.battles.Freshmeat.Duel;
        } else {
            target = this.battles.Freshmeat.Invade;
        }

        var battleButton = nHtml.FindByAttrContains(document.body, "input", "src", target);
        if (battleButton) {
            var form = battleButton.parentNode.parentNode;
            if (form) {
                var inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                if (inp) {
                    inp.value = userid;
                    this.lastBattleID = userid;
                    this.ClickBattleButton(battleButton);
                    this.notSafeCount = 0;
                    return true;
                }

                global.log(1, "target_id not found in battleForm");
            }

            global.log(1, "form not found in battleButton");
        } else {
            global.log(1, "battleButton not found");
        }

        return false;
    },

    battleRankTable: {
        0  : 'Acolyte',
        1  : 'Scout',
        2  : 'Soldier',
        3  : 'Elite Soldier',
        4  : 'Squire',
        5  : 'Knight',
        6  : 'First Knight',
        7  : 'Legionnaire',
        8  : 'Centurion',
        9  : 'Champion',
        10 : 'Lieutenant Commander',
        11 : 'Commander',
        12 : 'High Commander',
        13 : 'Lieutenant General',
        14 : 'General',
        15 : 'High General',
        16 : 'Baron',
        17 : 'Earl',
        18 : 'Duke',
        19 : 'Prince',
        20 : 'King',
        21 : 'High King'
    },

    warRankTable: {
        0 : 'No Rank',
        1 : 'Reserve',
        2 : 'Footman',
        3 : 'Corporal',
        4 : 'Lieutenant',
        5 : 'Captain',
        6 : 'First Captain',
        7 : 'Blackguard',
        8 : 'Warguard',
        9 : 'Master Warguard'
    },

    ClickBattleButton: function (battleButton) {
        gm.setValue('ReleaseControl', true);
        this.SetCheckResultsFunction('CheckBattleResults');
        this.Click(battleButton);
    },

    battles: {
        'Raid' : {
            Invade   : 'raid_attack_button.gif',
            Duel     : 'raid_attack_button2.gif',
            regex    : new RegExp('Rank: ([0-9]+) ([^0-9]+) ([0-9]+) ([^0-9]+) ([0-9]+)', 'i'),
            refresh  : 'raid',
            image    : 'tab_raid_on.gif'
        },
        'Freshmeat' : {
            Invade   : 'battle_01.gif',
            Duel     : 'battle_02.gif',
            War      : 'war_button_duel.gif',
            regex    : new RegExp('(.+)    \\(Level ([0-9]+)\\)\\s*Battle: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*War: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*([0-9]+)', 'i'),
            regex2   : new RegExp('(.+)    \\(Level ([0-9]+)\\)\\s*Battle: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*([0-9]+)', 'i'),
            warLevel : true,
            refresh  : 'battle_on.gif',
            image    : 'battle_on.gif'
        }
    },

    BattleFreshmeat: function (type) {
        try {
            var invadeOrDuel = gm.getValue('BattleType'),
                target       = "//input[contains(@src,'" + this.battles[type][invadeOrDuel] + "')]",
                ss           = document.evaluate(target, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

            global.log(1, 'target ' + target);
            if (ss.snapshotLength <= 0) {
                global.log(1, 'Not on battlepage');
                return false;
            }

            var plusOneSafe = false,
                safeTargets = [],
                count       = 0,
                chainId     = '',
                chainAttack = false,
                inp         = null,
                yourRank    = 0,
                txt         = '';

            chainId = gm.getValue('BattleChainId', '');
            gm.setValue('BattleChainId', '');
            if (gm.getValue("BattleType") === "War") {
                yourRank = this.stats.rank.war;
            } else {
                yourRank = this.stats.rank.battle;
            }

            // Lets get our Freshmeat user settings
            var minRank  = gm.getNumber("FreshMeatMinRank", 99),
                maxLevel = gm.getNumber("FreshMeatMaxLevel", ((invadeOrDuel === 'Invade') ? 1000 : 15)),
                ARBase   = gm.getNumber("FreshMeatARBase", 0.5),
                ARMax    = gm.getNumber("FreshMeatARMax", 1000),
                ARMin    = gm.getNumber("FreshMeatARMin", 0);

            //global.log(1, "my army/rank/level: " + this.stats.army.capped + "/" + this.stats.rank.battle + "/" + this.stats.level);
            for (var s = 0; s < ss.snapshotLength; s += 1) {
                var button = ss.snapshotItem(s),
                    tr = button;

                if (!tr) {
                    global.log(1, 'No tr parent of button?');
                    continue;
                }

                var userName = '',
                    rank     = 0,
                    level    = 0,
                    army     = 0,
                    levelm   = '';

                txt = '';
                if (type === 'Raid') {
                    tr = tr.parentNode.parentNode.parentNode.parentNode.parentNode;
                    txt = tr.childNodes[3].childNodes[3].textContent;
                    levelm = this.battles.Raid.regex.exec(txt);
                    if (!levelm) {
                        global.log(1, "Can't match battleRaidRe in " + txt);
                        continue;
                    }

                    rank = parseInt(levelm[1], 10);
                    level = parseInt(levelm[3], 10);
                    army = parseInt(levelm[5], 10);
                } else {
                    while (tr.tagName.toLowerCase() !== "tr") {
                        tr = tr.parentNode;
                    }

                    // If looking for demi points, and already full, continue
                    if (gm.getValue('DemiPointsFirst', false) && !gm.getValue('DemiPointsDone', true) && (gm.getValue('WhenMonster') !== 'Never')) {
                        var demiNumber = this.NumberOnly(this.CheckForImage('symbol_', tr).src.match(/\d+\.jpg/i).toString()) - 1,
                            demiName   = this.demiTable[demiNumber];

                        global.log(9, "Demi Points First", demiNumber, demiName, this.demi[demiName], gm.getValue('DemiPoint' + demiNumber));
                        if (this.demi[demiName].daily.dif <= 0 || !gm.getValue('DemiPoint' + demiNumber)) {
                            global.log(1, "Daily Demi Points done for", demiName);
                            continue;
                        }
                    }

                    txt = $.trim(nHtml.GetText(tr));
                    if (!txt.length) {
                        global.log(1, "Can't find txt in tr");
                        continue;
                    }

                    if (this.battles.Freshmeat.warLevel) {
                        levelm = this.battles.Freshmeat.regex.exec(txt);
                        if (!levelm) {
                            levelm = this.battles.Freshmeat.regex2.exec(txt);
                            this.battles.Freshmeat.warLevel = false;
                        }
                    } else {
                        levelm = this.battles.Freshmeat.regex2.exec(txt);
                        if (!levelm) {
                            levelm = this.battles.Freshmeat.regex.exec(txt);
                            this.battles.Freshmeat.warLevel = true;
                        }
                    }

                    if (!levelm) {
                        global.log(1, "Can't match Freshmeat.regex(2) in " + txt);
                        continue;
                    }

                    userName = levelm[1];
                    level = parseInt(levelm[2], 10);
                    if (gm.getValue("BattleType") === "War" && this.battles.Freshmeat.warLevel) {
                        rank = parseInt(levelm[6], 10);
                    } else {
                        rank = parseInt(levelm[4], 10);
                    }

                    if (this.battles.Freshmeat.warLevel) {
                        army = parseInt(levelm[7], 10);
                    } else {
                        army = parseInt(levelm[5], 10);
                    }
                }

                var levelMultiplier = this.stats.level / level,
                    armyRatio       = ARBase * levelMultiplier;

                armyRatio = Math.min(armyRatio, ARMax);
                armyRatio = Math.max(armyRatio, ARMin);
                if (armyRatio <= 0) {
                    global.log(1, "Bad ratio");
                    continue;
                }

                global.log(8, "Army Ratio: " + armyRatio + " Level: " + level + " Rank: " + rank + " Army: " + army);
                if (level - this.stats.level > maxLevel) {
                    global.log(8, "Greater than maxLevel");
                    continue;
                }

                if (yourRank && (yourRank - rank  > minRank)) {
                    global.log(8, "Greater than minRank");
                    continue;
                }

                // if we know our army size, and this one is larger than armyRatio, don't battle
                if (this.stats.army.capped && (army > (this.stats.army.capped * armyRatio))) {
                    global.log(8, "Greater than armyRatio");
                    continue;
                }

                inp = nHtml.FindByAttrXPath(tr, "input", "@name='target_id'");
                if (!inp) {
                    global.log(1, "Could not find 'target_id' input");
                    continue;
                }

                var userid = inp.value;
                if (this.hashThisId(userid)) {
                    continue;
                }

                if (gm.getValue("BattleType") === "War" && this.battles.Freshmeat.warLevel) {
                    global.log(1, "ID: " + userid + "    \tLevel: " + level + "\tWar Rank: " + rank + " \tArmy: " + army);
                } else {
                    global.log(1, "ID: " + userid + "    \tLevel: " + level + "\tBattle Rank: " + rank + "  \tArmy: " + army);
                }

                var dfl = gm.getValue('BattlesLostList', '');
                // don't battle people we recently lost to
                if (dfl.indexOf(global.vs + userid + global.vs) >= 0) {
                    global.log(1, "We lost to this id before: " + userid);
                    continue;
                }

                // don't battle people we've already battled too much
                if (this.doNotBattle && this.doNotBattle.indexOf(userid) >= 0) {
                    global.log(1, "We attacked this id before: " + userid);
                    continue;
                }

                var thisScore = (type === 'Raid' ? 0 : rank) - (army / levelMultiplier / this.stats.army.capped);
                if (userid === chainId) {
                    chainAttack = true;
                }

                var temp = {
                    id           : userid,
                    name         : userName,
                    score        : thisScore,
                    button       : button,
                    targetNumber : s + 1
                };

                safeTargets[count] = temp;
                count += 1;
                if (s === 0 && type === 'Raid') {
                    plusOneSafe = true;
                }

                for (var x = 0; x < count; x += 1) {
                    for (var y = 0 ; y < x ; y += 1) {
                        if (safeTargets[y].score < safeTargets[y + 1].score) {
                            temp = safeTargets[y];
                            safeTargets[y] = safeTargets[y + 1];
                            safeTargets[y + 1] = temp;
                        }
                    }
                }
            }

            if (count > 0) {
                var anyButton = null,
                    form      = null;

                if (chainAttack) {
                    anyButton = ss.snapshotItem(0);
                    form = anyButton.parentNode.parentNode;
                    inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                    if (inp) {
                        inp.value = chainId;
                        global.log(1, "Chain attacking: " + chainId);
                        this.ClickBattleButton(anyButton);
                        this.lastBattleID = chainId;
                        this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                        this.notSafeCount = 0;
                        return true;
                    }

                    global.log(1, "Could not find 'target_id' input");
                } else if (gm.getValue('PlusOneKills', false) && type === 'Raid') {
                    if (plusOneSafe) {
                        anyButton = ss.snapshotItem(0);
                        form = anyButton.parentNode.parentNode;
                        inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                        if (inp) {
                            var firstId = inp.value;
                            inp.value = '200000000000001';
                            global.log(1, "Target ID Overriden For +1 Kill. Expected Defender: " + firstId);
                            this.ClickBattleButton(anyButton);
                            this.lastBattleID = firstId;
                            this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                            this.notSafeCount = 0;
                            return true;
                        }

                        global.log(1, "Could not find 'target_id' input");
                    } else {
                        global.log(1, "Not safe for +1 kill.");
                    }
                } else {
                    for (var z = 0; z < count; z += 1) {
                        //global.log(1, "safeTargets["+z+"].id = "+safeTargets[z].id+" safeTargets["+z+"].score = "+safeTargets[z].score);
                        if (!this.lastBattleID && this.lastBattleID === safeTargets[z].id && z < count - 1) {
                            continue;
                        }

                        var bestButton = safeTargets[z].button;
                        if (bestButton !== null) {
                            global.log(1, 'Found Target score: ' + safeTargets[z].score + ' id: ' + safeTargets[z].id + ' Number: ' + safeTargets[z].targetNumber);
                            this.ClickBattleButton(bestButton);
                            this.lastBattleID = safeTargets[z].id;
                            this.lastUserName = safeTargets[z].userName;
                            this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                            this.notSafeCount = 0;
                            return true;
                        }

                        global.log(1, 'Attack button is null');
                    }
                }
            }

            this.notSafeCount += 1;
            if (this.notSafeCount > 100) {
                this.SetDivContent('battle_mess', 'Leaving Battle. Will Return Soon.');
                global.log(1, 'No safe targets limit reached. Releasing control for other processes.', this.notSafeCount);
                this.notSafeCount = 0;
                return false;
            }

            this.SetDivContent('battle_mess', 'No targets matching criteria');
            global.log(1, 'No safe targets', this.notSafeCount);

            if (type === 'Raid') {
                var engageButton = this.monsterEngageButtons[gm.getValue('targetFromraid', '')];
                if (engageButton) {
                    this.Click(engageButton);
                } else {
                    this.NavigateTo(this.battlePage + ',raid', 'tab_raid_on.gif');
                }
            } else {
                this.NavigateTo(this.battlePage + ',battle_on.gif');
            }

            return true;
        } catch (err) {
            global.error("ERROR in BattleFreshmeat: " + err);
            return this.ClickAjax('raid.php');
        }
    },

    CheckKeep: function () {
        try {
            if (!schedule.Check("keep")) {
                return false;
            }

            global.log(1, 'Visiting keep to get stats');
            return this.NavigateTo('keep', 'tab_stats_on.gif');
        } catch (err) {
            global.error("ERROR in CheckKeep: " + err);
            return false;
        }
    },

    CheckOracle: function () {
        try {
            if (!schedule.Check("oracle")) {
                return false;
            }

            global.log(9, "Checking Oracle for Favor Points");
            return this.NavigateTo('oracle', 'oracle_on.gif');
        } catch (err) {
            global.error("ERROR in CheckOracle: " + err);
            return false;
        }
    },

    CheckBattleRank: function () {
        try {
            if (!schedule.Check("battlerank")) {
                return false;
            }

            global.log(1, 'Visiting Battle Rank to get stats');
            return this.NavigateTo('battle,battlerank', 'tab_battle_rank_on.gif');
        } catch (err) {
            global.error("ERROR in CheckBattleRank: " + err);
            return false;
        }
    },

    CheckWarRank: function () {
        try {
            if (!schedule.Check("warrank")) {
                return false;
            }

            global.log(1, 'Visiting War Rank to get stats');
            return this.NavigateTo('battle,war_rank', 'tab_war_on.gif');
        } catch (err) {
            global.error("ERROR in CheckWar: " + err);
            return false;
        }
    },

    CheckGenerals: function () {
        try {
            if (!schedule.Check("generals")) {
                return false;
            }

            global.log(1, "Visiting generals to get 'General' list");
            return this.NavigateTo('mercenary,generals', 'tab_generals_on.gif');
        } catch (err) {
            global.error("ERROR in CheckGenerals: " + err);
            return false;
        }
    },

    CheckSoldiers: function () {
        try {
            if (!schedule.Check("soldiers")) {
                return false;
            }

            global.log(9, "Checking Soldiers");
            return this.NavigateTo('soldiers', 'tab_soldiers_on.gif');
        } catch (err) {
            global.error("ERROR in CheckSoldiers: " + err);
            return false;
        }
    },


    CheckItem: function () {
        try {
            if (!schedule.Check("item")) {
                return false;
            }

            global.log(9, "Checking Item");
            return this.NavigateTo('soldiers,item', 'tab_black_smith_on.gif');
        } catch (err) {
            global.error("ERROR in CheckItem: " + err);
            return false;
        }
    },

    CheckMagic: function () {
        try {
            if (!schedule.Check("magic")) {
                return false;
            }

            global.log(9, "Checking Magic");
            return this.NavigateTo('soldiers,magic', 'tab_magic_on.gif');
        } catch (err) {
            global.error("ERROR in CheckMagic: " + err);
            return false;
        }
    },

    CheckAchievements: function () {
        try {
            if (!schedule.Check("achievements")) {
                return false;
            }

            global.log(1, 'Visiting achievements to get stats');
            return this.NavigateTo('keep,achievements', 'tab_achievements_on.gif');
        } catch (err) {
            global.error("ERROR in CheckAchievements: " + err);
            return false;
        }
    },

    CheckSymbolQuests: function () {
        try {
            if (!schedule.Check("symbolquests")) {
                return false;
            }

            global.log(1, "Visiting symbolquests to get 'Demi-Power' points");
            return this.NavigateTo('quests,symbolquests', 'demi_quest_on.gif');
        } catch (err) {
            global.error("ERROR in CheckSymbolQuests: " + err);
            return false;
        }
    },

    CheckCharacterClasses: function () {
        try {
            if (!schedule.Check("view_class_progress")) {
                return false;
            }

            global.log(9, "Checking Monster Class to get Character Class Stats");
            return this.NavigateTo('battle_monster,view_class_progress', 'nm_class_whole_progress_bar.jpg');
        } catch (err) {
            global.error("ERROR in CheckCharacterClasses: " + err);
            return false;
        }
    },

    Battle: function (mode) {
        try {
            var whenBattle    = '',
                target        = '',
                battletype    = '',
                useGeneral    = '',
                staminaReq    = 0,
                chainImg      = '',
                button        = null,
                raidName      = '',
                dfl           = '',
                battleChainId = '';

            whenBattle = gm.getValue('WhenBattle', '');
            switch (whenBattle) {
            case 'Never' :
                this.SetDivContent('battle_mess', 'Battle off');
                return false;
            case 'Stay Hidden' :
                if (!this.NeedToHide()) {
                    this.SetDivContent('battle_mess', 'We Dont Need To Hide Yet');
                    global.log(1, 'We Dont Need To Hide Yet');
                    return false;
                }

                break;
            case 'No Monster' :
                if (mode !== 'DemiPoints') {
                    if ((gm.getValue('WhenMonster', '') !== 'Never') && gm.getValue('targetFrombattle_monster') && !gm.getValue('targetFrombattle_monster').match(/the deathrune siege/i)) {
                        return false;
                    }
                }

                break;
            default :
                global.log(1, 'WhenBattle is unknown', whenBattle);
                return false;
            }

            if (this.CheckKeep()) {
                return true;
            } else if (this.stats.health.num < 10) {
                global.log(9, 'Health is less than 10', this.stats.health.num);
                return false;
            }

            target = this.GetCurrentBattleTarget(mode);
            global.log(9, 'Mode/Target', mode, target);
            if (!target) {
                global.log(1, 'No valid battle target');
                return false;
            } else if (typeof target === 'string') {
                target = target.toLowerCase();
            }

            if (target === 'noraid') {
                global.log(9, 'No Raid To Attack');
                return false;
            }

            battletype = gm.getValue('BattleType', '');
            switch (battletype) {
            case 'Invade' :
                useGeneral = 'BattleGeneral';
                staminaReq = 1;
                chainImg = 'battle_invade_again.gif';
                break;
            case 'Duel' :
                useGeneral = 'DuelGeneral';
                staminaReq = 1;
                chainImg = 'battle_duel_again.gif';
                break;
            case 'War' :
                useGeneral = 'WarGeneral';
                staminaReq = 10;
                chainImg = 'battle_duel_again.gif';
                break;
            default :
                global.log(1, 'Unknown battle type ', battletype);
                return false;
            }

            if (!this.CheckStamina('Battle', staminaReq)) {
                global.log(9, 'Not enough stamina for ', battletype);
                return false;
            } else if (general.Select(useGeneral)) {
                return true;
            }

            // Check if we should chain attack
            if ($("img[src*='battle_victory.gif']").length) {
                button = this.CheckForImage(chainImg);
                battleChainId = gm.getValue("BattleChainId", '');
                if (button && battleChainId) {
                    this.SetDivContent('battle_mess', 'Chain Attack In Progress');
                    global.log(1, 'Chaining Target', battleChainId);
                    this.ClickBattleButton(button);
                    gm.setValue("BattleChainId", '');
                    return true;
                }
            }

            if (!this.notSafeCount) {
                this.notSafeCount = 0;
            }

            global.log(1, 'Battle Target', target);
            switch (target) {
            case 'raid' :
                this.SetDivContent('battle_mess', 'Joining the Raid');
                if (this.NavigateTo(this.battlePage + ',raid', 'tab_raid_on.gif')) {
                    return true;
                }

                if (gm.getValue('clearCompleteRaids', false) && this.completeButton.raid) {
                    this.Click(this.completeButton.raid, 1000);
                    this.completeButton.raid = '';
                    global.log(1, 'Cleared a completed raid');
                    return true;
                }

                raidName = gm.getValue('targetFromraid', '');
                if (!$("div[style*='dragon_title_owner']").length) {
                    button = this.monsterEngageButtons[raidName];
                    if (button) {
                        this.Click(button);
                        return true;
                    }

                    global.log(1, 'Unable to engage raid', raidName);
                    return false;
                }

                if (this.monsterConfirmRightPage(raidName)) {
                    return true;
                }

                // The user can specify 'raid' in their Userid List to get us here. In that case we need to adjust NextBattleTarget when we are done
                if (gm.getValue('TargetType', '') === "Userid List") {
                    if (this.BattleFreshmeat('Raid')) {
                        if ($("span[class*='result_body']").length) {
                            this.NextBattleTarget();
                        }

                        if (this.notSafeCount > 10) {
                            this.notSafeCount = 0;
                            this.NextBattleTarget();
                        }

                        return true;
                    }

                    global.log(1, 'Doing Raid UserID list, but no target');
                    return false;
                }

                return this.BattleFreshmeat('Raid');
            case 'freshmeat' :
                if (this.NavigateTo(this.battlePage, 'battle_on.gif')) {
                    return true;
                }

                this.SetDivContent('battle_mess', 'Battling ' + target);
                // The user can specify 'freshmeat' in their Userid List to get us here. In that case we need to adjust NextBattleTarget when we are done
                if (gm.getValue('TargetType', '') === "Userid List") {
                    if (this.BattleFreshmeat('Freshmeat')) {
                        if ($("span[class*='result_body']").length) {
                            this.NextBattleTarget();
                        }

                        if (this.notSafeCount > 10) {
                            this.notSafeCount = 0;
                            this.NextBattleTarget();
                        }

                        return true;
                    }

                    global.log(1, 'Doing Freshmeat UserID list, but no target');
                    return false;
                }

                return this.BattleFreshmeat('Freshmeat');
            default:
                dfl = gm.getValue('BattlesLostList', '');
                if (dfl.indexOf(global.vs + target + global.vs) >= 0) {
                    global.log(1, 'Avoiding Losing Target', target);
                    this.NextBattleTarget();
                    return true;
                }

                if (this.NavigateTo(this.battlePage, 'battle_on.gif')) {
                    return true;
                }

                gm.setValue('BattleChainId', '');
                if (this.BattleUserId(target)) {
                    this.NextBattleTarget();
                    return true;
                }

                global.log(1, 'Doing default UserID list, but no target');
                return false;
            }
        } catch (err) {
            global.error("ERROR in Battle: " + err);
            return false;
        }
    },

    NextBattleTarget: function () {
        var battleUpto = gm.getValue('BattleTargetUpto', 0);
        gm.setValue('BattleTargetUpto', battleUpto + 1);
    },

    GetCurrentBattleTarget: function (mode) {
        if (mode === 'DemiPoints') {
            if (gm.getValue('targetFromraid', '') && gm.getValue('TargetType', '') === 'Raid') {
                return 'Raid';
            }

            return 'Freshmeat';
        }

        if (gm.getValue('TargetType', '') === 'Raid') {
            if (gm.getValue('targetFromraid', '')) {
                return 'Raid';
            }

            this.SetDivContent('battle_mess', 'No Raid To Attack');
            return 'NoRaid';
        }

        if (gm.getValue('TargetType', '') === 'Freshmeat') {
            return 'Freshmeat';
        }

        var target = gm.getValue('BattleChainId');
        if (target) {
            return target;
        }

        var targets = gm.getList('BattleTargets');
        if (!targets.length) {
            return false;
        }

        var battleUpto = gm.getValue('BattleTargetUpto', 0);
        if (battleUpto > targets.length - 1) {
            battleUpto = 0;
            gm.setValue('BattleTargetUpto', 0);
        }

        if (!targets[battleUpto]) {
            this.NextBattleTarget();
            return false;
        }

        this.SetDivContent('battle_mess', 'Battling User ' + gm.getValue('BattleTargetUpto', 0) + '/' + targets.length + ' ' + targets[battleUpto]);
        if (targets[battleUpto].toLowerCase() === 'raid') {
            if (gm.getValue('targetFromraid', '')) {
                return 'Raid';
            }

            this.SetDivContent('battle_mess', 'No Raid To Attack');
            this.NextBattleTarget();
            return false;
        }

        return targets[battleUpto];
    },

    /////////////////////////////////////////////////////////////////////
    //                          ATTACKING MONSTERS
    /////////////////////////////////////////////////////////////////////

    // http://castleage.wikidot.com/monster for monster info

    // http://castleage.wikidot.com/skaar
    monsterInfo: {
        'Deathrune' : {
            duration     : 96,
            hp           : 100000000,
            ach          : 1000000,
            siege        : 5,
            siegeClicks  : [30, 60, 90, 120, 200],
            siegeDam     : [6600000, 8250000, 9900000, 13200000, 16500000],
            siege_img    : '/graphics/death_siege_small',
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            reqAtkButton : 'attack_monster_button.jpg',
            v            : 'attack_monster_button2.jpg',
            defButton    : 'button_dispel.gif',
            defense_img  : 'bar_dispel.gif'
        },
        'Ice Elemental' : {
            duration     : 168,
            hp           : 100000000,
            ach          : 1000000,
            siege        : 5,
            siegeClicks  : [30, 60, 90, 120, 200],
            siegeDam     : [7260000, 9075000, 10890000, 14520000, 18150000],
            siege_img    : '/graphics/water_siege_small',
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            reqAtkButton : 'attack_monster_button.jpg',
            pwrAtkButton : 'attack_monster_button2.jpg',
            defButton    : 'button_dispel.gif',
            defense_img  : 'bar_dispel.gif'
        },
        'Earth Elemental' : {
            duration     : 168,
            hp           : 100000000,
            ach          : 1000000,
            siege        : 5,
            siegeClicks  : [30, 60, 90, 120, 200],
            siegeDam     : [6600000, 8250000, 9900000, 13200000, 16500000],
            siege_img    : '/graphics/earth_siege_small',
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            reqAtkButton : 'attack_monster_button.jpg',
            pwrAtkButton : 'attack_monster_button2.jpg',
            defButton    : 'attack_monster_button3.jpg',
            defense_img  : 'seamonster_ship_health.jpg',
            repair_img   : 'repair_bar_grey.jpg'
        },
        'Hydra' : {
            duration     : 168,
            hp           : 100000000,
            ach          : 500000,
            siege        : 6,
            siegeClicks  : [10, 20, 50, 100, 200, 300],
            siegeDam     : [1340000, 2680000, 5360000, 14700000, 28200000, 37520000],
            siege_img    : '/graphics/monster_siege_small',
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50]
        },
        'Legion' : {
            duration     : 168,
            hp           : 100000,
            ach          : 1000,
            siege        : 6,
            siegeClicks  : [10, 20, 40, 80, 150, 300],
            siegeDam     : [3000, 4500, 6000, 9000, 12000, 15000],
            siege_img    : '/graphics/castle_siege_small',
            fort         : true,
            staUse       : 5,
            defense_img  : 'seamonster_ship_health.jpg',
            repair_img   : 'repair_bar_grey.jpg'
        },
        'Emerald Dragon' : {
            duration     : 72,
            ach          : 100000,
            siege        : 0
        },
        'Frost Dragon' : {
            duration     : 72,
            ach          : 100000,
            siege        : 0
        },
        'Gold Dragon' : {
            duration     : 72,
            ach          : 100000,
            siege        : 0
        },
        'Red Dragon' : {
            duration     : 72,
            ach          : 100000,
            siege        : 0
        },
        'King'      : {
            duration     : 72,
            ach          : 15000,
            siege        : 0
        },
        'Terra'     : {
            duration     : 72,
            ach          : 20000,
            siege        : 0
        },
        'Queen'     : {
            duration     : 48,
            ach          : 50000,
            siege        : 1,
            siegeClicks  : [11],
            siegeDam     : [500000],
            siege_img    : '/graphics/boss_sylvanas_drain_icon.gif'
        },
        'Ravenmoore' : {
            duration     : 48,
            ach          : 500000,
            siege        : 0
        },
        'Knight'    : {
            duration     : 48,
            ach          : 30000,
            siege        : 0,
            reqAtkButton : 'event_attack1.gif',
            pwrAtkButton : 'event_attack2.gif',
            defButton    : null
        },
        'Serpent'   : {
            duration     : 72,
            ach          : 250000,
            siege        : 0,
            fort         : true,
            //staUse       : 5,
            defense_img  : 'seamonster_ship_health.jpg'
        },
        'Raid I'    : {
            duration     : 88,
            ach          : 50,
            siege        : 2,
            siegeClicks  : [30, 50],
            siegeDam     : [200, 500],
            siege_img    : '/graphics/monster_siege_',
            staUse       : 1
        },
        'Raid II'   : {
            duration     : 144,
            ach          : 50,
            siege        : 2,
            siegeClicks  : [80, 100],
            siegeDam     : [300, 1500],
            siege_img    : '/graphics/monster_siege_',
            staUse       : 1
        },
        'Mephistopheles' : {
            duration     : 48,
            ach          : 200000,
            siege        : 0
        },
        // http://castleage.wikia.com/wiki/War_of_the_Red_Plains
        'Plains' : {
            alpha        : true,
            duration     : 168,
            hp           : 350000000,
            ach          : 10000,
            siege        : 7,
            siegeClicks  : [30, 60, 90, 120, 200, 250, 300],
            siegeDam     : [13750000, 17500000, 20500000, 23375000, 26500000, 29500000, 34250000],
            siege_img    : [
                '/graphics/water_siege_',
                '/graphics/alpha_bahamut_siege_blizzard_',
                '/graphics/azriel_siege_inferno_',
                '/graphics/war_siege_holy_smite_'
            ],
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            defense_img  : 'nm_green.jpg'
        },
        // http://castleage.wikia.com/wiki/Bahamut,_the_Volcanic_Dragon
        'Volcanic Dragon' : {
            alpha        : true,
            duration     : 168,
            hp           : 130000000,
            ach          : 4000000,
            siege        : 5,
            siegeClicks  : [30, 60, 90, 120, 200],
            siegeDam     : [7896000, 9982500, 11979000, 15972000, 19965000],
            siege_img    : ['/graphics/water_siege_'],
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            defense_img  : 'nm_green.jpg'
        },
        // http://castleage.wikidot.com/alpha-bahamut
        // http://castleage.wikia.com/wiki/Alpha_Bahamut,_The_Volcanic_Dragon
        'Alpha Volcanic Dragon' : {
            alpha        : true,
            duration     : 168,
            hp           : 620000000,
            ach          : 8000000,
            siege        : 7,
            siegeClicks  : [30, 60, 90, 120, 200, 250, 300],
            siegeDam     : [22250000, 27500000, 32500000, 37500000, 42500000, 47500000, 55000000],
            siege_img    : [
                '/graphics/water_siege_',
                '/graphics/alpha_bahamut_siege_blizzard_',
                '/graphics/azriel_siege_inferno_'
            ],
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            defense_img  : 'nm_green.jpg'
        },
        // http://castleage.wikia.com/wiki/Azriel,_the_Angel_of_Wrath
        'Wrath' : {
            alpha        : true,
            duration     : 168,
            hp           : 600000000,
            ach          : 8000000,
            siege        : 7,
            siegeClicks  : [30, 60, 90, 120, 200, 250, 300],
            siegeDam     : [22250000, 27500000, 32500000, 37500000, 42500000, 47500000, 55000000],
            siege_img    : [
                '/graphics/water_siege_',
                '/graphics/alpha_bahamut_siege_blizzard_',
                '/graphics/azriel_siege_inferno_'
            ],
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            defense_img  : 'nm_green.jpg'
        },

        'Alpha Mephistopheles' : {
            alpha        : true,
            duration     : 168,
            hp           : 600000000,
            ach          : 12000000,
            siege        : 10,
            siegeClicks  : [15, 30, 45, 60, 75, 100, 150, 200, 250, 300],
            siegeDam     : [19050000, 22860000, 26670000, 30480000, 34290000, 38100000, 45720000, 49530000, 53340000, 60960000],
            siege_img    : [
                '/graphics/earth_siege_',
                '/graphics/castle_siege_',
                '/graphics/skaar_siege_'
            ],
            fort         : true,
            staUse       : 5,
            staLvl       : [0, 100, 200, 500],
            staMax       : [5, 10, 20, 50],
            nrgMax       : [10, 20, 40, 100],
            defense_img  : 'nm_green.jpg'
        }
    },

    monsterArray: [],

    monsterRecord: function () {
        this.data = {
            name       : '',
            attacked   : -1,
            defended   : -1,
            damage     : -1,
            life       : -1,
            fortify    : -1,
            timeLeft   : '',
            t2k        : -1,
            phase      : '',
            link       : '',
            rix        : -1,
            over       : '',
            page       : '',
            color      : '',
            review     : -1,
            type       : '',
            conditions : '',
            charClass  : '',
            strength   : -1,
            stun       : -1,
            stunTime   : -1,
            tip        : ''
        };
    },

    LoadMonsters: function () {
        $.extend(this.monsterArray, gm.getJValue('monsterArray'));
    },

    SaveMonsters: function () {
        gm.setJValue('monsterArray', this.monsterArray);
    },

    monster: {},

    monsterEngageButtons: {},

    completeButton: {},

    parseCondition: function (type, conditions) {
        try {
            if (!conditions || conditions.toLowerCase().indexOf(':' + type) < 0) {
                return false;
            }

            var str    = '',
                value  = 0,
                first  = false,
                second = false;

            str = conditions.substring(conditions.indexOf(':' + type) + type.length + 1).replace(new RegExp(":.+"), '');
            value = parseFloat(str);
            if (/k$/i.test(str) || /m$/i.test(str)) {
                first = /\d+k/i.test(str);
                second = /\d+m/i.test(str);
                value = value * 1000 * (first + second * 1000);
            }

            return value;
        } catch (err) {
            global.error("ERROR in parseCondition: " + err);
            return false;
        }
    },

    getMonstType: function (name) {
        try {
            var words = [],
                count = 0;

            words = name.split(" ");
            count = words.length - 1;
            if (count >= 4) {
                if (words[count - 4] === 'Alpha' && words[count - 1] === 'Volcanic' && words[count] === 'Dragon') {
                    return words[count - 4] + ' ' + words[count - 1] + ' ' + words[count];
                }
            }

            if (words[count] === 'Mephistopheles' && words[count - 1] === 'Alpha') {
                return words[count - 1] + ' ' + words[count];
            }

            if (words[count] === 'Elemental' || words[count] === 'Dragon') {
                return words[count - 1] + ' ' + words[count];
            }

            return words[count];
        } catch (err) {
            global.error("ERROR in getMonstType: " + err);
            return '';
        }
    },

    getMonsterRecord: function (name) {
        var it        = 0,
            success   = false,
            newRecord = null;

        for (it = 0; it < this.monsterArray.length; it += 1) {
            if (this.monsterArray[it].name === name) {
                success = true;
                break;
            }
        }

        if (success) {
            global.log(3, "Got monster record", name, this.monsterArray[it]);
            return this.monsterArray[it];
        } else {
            newRecord = new this.monsterRecord();
            newRecord.data.name = name;
            global.log(3, "New monster record", name, newRecord.data);
            return newRecord.data;
        }
    },

    delMonsterRecord: function (name) {
        var it        = 0,
            success   = false;

        for (it = 0; it < this.monsterArray.length; it += 1) {
            if (this.monsterArray[it].name === name) {
                success = true;
                break;
            }
        }

        if (success) {
            this.monsterArray.splice(it, 1);
            this.SaveMonsters();
            global.log(3, "Deleted monster record", name, this.monsterArray);
            return true;
        } else {
            global.log(1, "Unable to delete monster record", name, this.monsterArray);
            return false;
        }
    },

    updateMonsterRecord: function (record) {
        if (record && record.name) {
            var it      = 0,
                success = false;

            for (it = 0; it < this.monsterArray.length; it += 1) {
                if (this.monsterArray[it].name === record.name) {
                    success = true;
                    break;
                }
            }

            if (success) {
                this.monsterArray[it] = record;
                global.log(3, "Updated monster record", record, this.monsterArray);
            } else {
                this.monsterArray.push(record);
                global.log(3, "Added monster record", record, this.monsterArray);
            }

            this.SaveMonsters();
            return true;
        } else {
            global.log(1, "updateMonsterRecord was not passed a record", record);
            return false;
        }
    },

    CheckResults_fightList: function () {
        try {
            global.log(9, "CheckResults_fightList - get all buttons to check monsterObjectList");
            // get all buttons to check monsterObjectList
            var ss = document.evaluate(".//img[contains(@src,'dragon_list_btn_') or contains(@src,'mp_button_summon_')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (ss.snapshotLength === 0) {
                global.log(1, "No monster buttons found");
                return false;
            }

            var page                  = gm.getValue('page', 'battle_monster'),
                firstMonsterButtonDiv = this.CheckForImage('dragon_list_btn_');

            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + this.stats.FBID) ||
                    firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                var pageUserCheck = gm.getValue('pageUserCheck', '');
                if (pageUserCheck) {
                    global.log(1, "On another player's keep.", pageUserCheck);
                    return false;
                }
            }

            if (page === 'battle_monster' && ss.snapshotLength === 1) {
                global.log(1, "No monsters to review");
                gm.setValue('reviewDone', 1);
                return true;
            }

            var startCount = 0;
            if (page === 'battle_monster') {
                startCount = 1;
            }

            global.log(9, "startCount", startCount);
            // Review monsters and find attack and fortify button
            var monsterReviewed = {};
            for (var s = startCount; s < ss.snapshotLength; s += 1) {
                var engageButtonName = ss.snapshotItem(s).src.match(/dragon_list_btn_\d/i)[0],
                    monsterRow       = ss.snapshotItem(s).parentNode.parentNode.parentNode.parentNode,
                    monsterFull      = $.trim(nHtml.GetText(monsterRow)),
                    monster          = $.trim(monsterFull.replace('Completed!', '').replace(/Fled!/i, ''));

                // Make links for easy clickin'
                var url = ss.snapshotItem(s).parentNode.href;
                if (!(url && url.match(/user=/) && (url.match(/mpool=/) || url.match(/raid\.php/)))) {
                    continue;
                }

                global.log(5, "monster", monster);
                monsterReviewed = this.getMonsterRecord(monster);
                monsterReviewed.page = page;
                switch (engageButtonName) {
                case 'dragon_list_btn_2' :
                    monsterReviewed.status = 'Collect Reward';
                    monsterReviewed.color = 'grey';
                    break;
                case 'dragon_list_btn_3' :
                    this.monsterEngageButtons[monster] = ss.snapshotItem(s);
                    break;
                case 'dragon_list_btn_4' :
                    if (page === 'raid' && !(/!/.test(monsterFull))) {
                        this.monsterEngageButtons[monster] = ss.snapshotItem(s);
                        break;
                    }

                    if (!this.completeButton[page]) {
                        this.completeButton[page] = this.CheckForImage('cancelButton.gif', monsterRow);
                    }

                    monsterReviewed.status = 'Complete';
                    monsterReviewed.color = 'grey';
                    break;
                default :
                }

                var mpool     = ((url.match(/mpool=\d+/i)) ? '&mpool=' + url.match(/mpool=\d+/i)[0].split('=')[1] : ''),
                    monstType = this.getMonstType(monster),
                    siege     = '';

                if (monstType === 'Siege') {
                    siege = "&action=doObjective";
                } else {
                    var boss = this.monsterInfo[monstType];
                    siege = (boss && boss.siege) ? "&action=doObjective" : '';
                }

                var link = "<a href='http://apps.facebook.com/castle_age/" + page + ".php?casuser=" +
                            url.match(/user=\d+/i)[0].split('=')[1] + mpool + siege + "'>Link</a>";

                monsterReviewed.link = link;
                this.updateMonsterRecord(monsterReviewed);
            }

            var it = 0,
                delList = [];

            for (it = 0; it < this.monsterArray.length; it += 1) {
                if (this.monsterArray[it].page === '') {
                    delList.push(this.monsterArray[it].name);
                }
            }

            for (it = 0; it < delList.length; it += 1) {
                this.delMonsterRecord(delList[it]);
            }

            gm.setValue('reviewDone', 1);
            this.UpdateDashboard(true);
            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_fightList: " + err);
            return false;
        }
    },

    t2kCalc: function (boss, time, percentHealthLeft, siegeStage, clicksNeededInCurrentStage) {
        try {
            var siegeStageStr                  = '',
                timeLeft                       = 0,
                timeUsed                       = 0,
                T2K                            = 0,
                damageDone                     = 0,
                hpLeft                         = 0,
                totalSiegeDamage               = 0,
                totalSiegeClicks               = 0,
                attackDamPerHour               = 0,
                clicksPerHour                  = 0,
                clicksToNextSiege              = 0,
                nextSiegeAttackPlusSiegeDamage = 0,
                s                              = 0,
                siegeImpacts                   = 0;


            timeLeft = parseInt(time[0], 10) + (parseInt(time[1], 10) * 0.0166);
            timeUsed = boss.duration - timeLeft;
            if (!boss.siege || !boss.hp) {
                return (percentHealthLeft * timeUsed) / (100 - percentHealthLeft);
            }

            siegeStageStr = (siegeStage - 1).toString();
            damageDone = (100 - percentHealthLeft) / 100 * boss.hp;
            hpLeft = boss.hp - damageDone;
            for (s in boss.siegeClicks) {
                if (boss.siegeClicks.hasOwnProperty(s)) {
                    global.log(9, 's ', s, ' T2K ', T2K, ' hpLeft ', hpLeft);
                    if (s < siegeStageStr  || clicksNeededInCurrentStage === 0) {
                        totalSiegeDamage += boss.siegeDam[s];
                        totalSiegeClicks += boss.siegeClicks[s];
                    }

                    if (s === siegeStageStr) {
                        attackDamPerHour = (damageDone - totalSiegeDamage) / timeUsed;
                        clicksPerHour = (totalSiegeClicks + boss.siegeClicks[s] - clicksNeededInCurrentStage) / timeUsed;
                        global.log(9, 'Attack Damage Per Hour: ', attackDamPerHour, ' Damage Done: ', damageDone, ' Total Siege Damage: ', totalSiegeDamage, ' Time Used: ', timeUsed, ' Clicks Per Hour: ', clicksPerHour);
                    }

                    if (s >= siegeStageStr) {
                        clicksToNextSiege = (s === siegeStageStr) ? clicksNeededInCurrentStage : boss.siegeClicks[s];
                        nextSiegeAttackPlusSiegeDamage = boss.siegeDam[s] + clicksToNextSiege / clicksPerHour * attackDamPerHour;
                        if (hpLeft <= nextSiegeAttackPlusSiegeDamage || clicksNeededInCurrentStage === 0) {
                            T2K += hpLeft / attackDamPerHour;
                            break;
                        }

                        T2K += clicksToNextSiege / clicksPerHour;
                        hpLeft -= nextSiegeAttackPlusSiegeDamage;
                    }
                }
            }

            siegeImpacts = percentHealthLeft / (100 - percentHealthLeft) * timeLeft;
            global.log(1, 'T2K based on siege: ' + T2K.toFixed(2) + ' T2K estimate without calculating siege impacts: ' + siegeImpacts.toFixed(2));
            return T2K;
        } catch (err) {
            global.error("ERROR in t2kCalc: " + err);
            return 0;
        }
    },

    CheckResults_viewFight: function () {
        try {
            var missRegEx         = new RegExp(".*Need (\\d+) more.*"),
                currentMonster    = {},
                time              = [],
                currentPhase      = 0,
                miss              = '',
                tempDiv           = null,
                tempText          = '',
                tempArr           = [],
                counter           = 0,
                monstHealthImg    = '',
                totalCount        = 0,
                ind               = 0,
                divSeigeLogs      = null,
                divSeigeCount     = 0,
                achLevel          = 0,
                maxDamage         = 0,
                maxToFortify      = 0,
                isTarget          = false,
                KOBenable         = false,
                KOBbiasHours      = 0,
                KOBach            = false,
                KOBmax            = false,
                KOBminFort        = false,
                KOBtmp            = 0,
                KOBtimeLeft       = 0,
                KOBbiasedTF       = 0,
                KOBPercentTimeRemaining = 0,
                KOBtotalMonsterTime = 0,
                monsterDiv        = null;

            monsterDiv = $("div[style*='dragon_title_owner']");
            if (monsterDiv && monsterDiv.length) {
                tempText = $.trim(monsterDiv.children(":eq(2)").text());
            } else {
                monsterDiv = $("div[style*='nm_top']");
                if (monsterDiv && monsterDiv.length) {
                    tempText = $.trim(monsterDiv.children(":eq(0)").children(":eq(0)").text());
                    tempDiv = $("div[style*='nm_bars']");
                    if (tempDiv && tempDiv.length) {
                        tempText += ' ' + $.trim(tempDiv.children(":eq(0)").children(":eq(0)").children(":eq(0)").siblings(":last").children(":eq(0)").text()).replace("'s Life", "");
                    } else {
                        global.log(1, "Problem finding nm_bars");
                        return;
                    }
                } else {
                    global.log(1, "Problem finding dragon_title_owner and nm_top");
                    return;
                }
            }

            if (monsterDiv.find("img[uid='" + this.stats.FBID + "']").length) {
                global.log(1, "monster name found");
                tempText = tempText.replace(new RegExp(".+'s "), 'Your ');
            }

            global.log(1, "monster name", tempText);
            currentMonster = this.getMonsterRecord(tempText);
            currentMonster.type = this.getMonstType(currentMonster.name);
            if (currentMonster.type === 'Siege') {
                tempDiv = $("div[style*='raid_back']");
                if (tempDiv && tempDiv.length) {
                    if (tempDiv.find("img[src*='raid_1_large.jpg']").length) {
                        currentMonster.type = 'Raid I';
                    } else if (tempDiv.find("img[src*='raid_b1_large.jpg']").length) {
                        currentMonster.type = 'Raid II';
                    } else {
                        global.log(1, "Problem finding raid image, probably finished");
                    }
                } else {
                    global.log(1, "Problem finding raid_back");
                    return;
                }
            }

            currentMonster.review = new Date().getTime();
            gm.setValue('monsterRepeatCount', 0);
            // Extract info
            tempDiv = $("#app46755028429_monsterTicker");
            if (tempDiv && tempDiv.length) {
                global.log(2, "Monster ticker found.");
                time = tempDiv.text().split(":");
            } else {
                global.log(1, "Could not locate Monster ticker.");
            }

            if (time && time.length === 3 && this.monsterInfo[currentMonster.type] && this.monsterInfo[currentMonster.type].fort) {
                if (currentMonster.type === "Deathrune" || currentMonster.type === 'Ice Elemental') {
                    currentMonster.fortify = 100;
                } else {
                    currentMonster.fortify = 0;
                }

                switch (this.monsterInfo[currentMonster.type].defense_img) {
                case 'bar_dispel.gif' :
                    tempDiv = $("img[src*='" + this.monsterInfo[currentMonster.type].defense_img + "']");
                    if (tempDiv && tempDiv.length) {
                        currentMonster.fortify = 100 - parseFloat(tempDiv.parent().css('width'));
                    } else {
                        global.log(1, "Unable to find defense bar", this.monsterInfo[currentMonster.type].defense_img);
                    }

                    break;
                case 'seamonster_ship_health.jpg' :
                    tempDiv = $("img[src*='" + this.monsterInfo[currentMonster.type].defense_img + "']");
                    if (tempDiv && tempDiv.length) {
                        currentMonster.fortify = parseFloat(tempDiv.parent().css('width'));
                        if (this.monsterInfo[currentMonster.type].repair_img) {
                            tempDiv = $("img[src*='" + this.monsterInfo[currentMonster.type].repair_img + "']");
                            if (tempDiv && tempDiv.length) {
                                currentMonster.fortify = currentMonster.fortify * (100 / (100 - parseFloat(tempDiv.parent().css('width'))));
                            } else {
                                global.log(1, "Unable to find repair bar", this.monsterInfo[currentMonster.type].repair_img);
                            }
                        }
                    } else {
                        global.log(1, "Unable to find defense bar", this.monsterInfo[currentMonster.type].defense_img);
                    }

                    break;
                case 'nm_green.jpg' :
                    tempDiv = $("img[src*='" + this.monsterInfo[currentMonster.type].defense_img + "']");
                    if (tempDiv && tempDiv.length) {
                        currentMonster.fortify = parseFloat(tempDiv.parent().css('width'));
                        currentMonster.strength = parseFloat(tempDiv.parent().parent().css('width'));
                    } else {
                        global.log(1, "Unable to find defense bar", this.monsterInfo[currentMonster.type].defense_img);
                    }

                    // Character type stuff
                    monsterDiv = $("div[style*='nm_bottom']");
                    if (monsterDiv && monsterDiv.length) {
                        tempText = $.trim(monsterDiv.children().eq(0).children().text()).replace(new RegExp("[\\s\\s]+", 'g'), ' ');
                        if (tempText) {
                            global.log(2, "tempText", tempText);
                            tempArr = tempText.match(/Class: (\w+) /);
                            if (tempArr && tempArr.length === 2) {
                                currentMonster.charClass = tempArr[1];
                                global.log(5, "character", currentMonster.charClass);
                            } else {
                                global.log(1, "Can't get character", tempArr);
                            }

                            tempArr = tempText.match(/Tip: ([\w ]+) Status/);
                            if (tempArr && tempArr.length === 2) {
                                currentMonster.tip = tempArr[1];
                                global.log(5, "tip", currentMonster.tip);
                            } else {
                                global.log(1, "Can't get tip", tempArr);
                            }

                            tempArr = tempText.match(/Status Time Remaining: ([0-9]+):([0-9]+):([0-9]+)\s*/);
                            if (tempArr && tempArr.length === 4) {
                                currentMonster.stunTime = new Date().getTime() + (tempArr[1] * 60 * 60 * 1000) + (tempArr[2] * 60 * 1000) + (tempArr[3] * 1000);
                                global.log(5, "statusTime", currentMonster.stunTime);
                            } else {
                                global.log(1, "Can't get statusTime", tempArr);
                            }

                            tempDiv = monsterDiv.find("img[src*='nm_stun_bar']");
                            if (tempDiv && tempDiv.length) {
                                tempText = tempDiv.css('width');
                                global.log(2, "tempText", tempText);
                                if (tempText) {
                                    currentMonster.stun = this.NumberOnly(tempText);
                                    global.log(5, "stun", currentMonster.stun);
                                } else {
                                    global.log(1, "Can't get stun bar width");
                                }
                            } else {
                                global.log(1, "Can't get stun bar");
                            }

                            if (currentMonster.charClass && currentMonster.tip && currentMonster.stun !== -1) {
                                currentMonster.stunDo = new RegExp(currentMonster.charClass).test(currentMonster.tip) && currentMonster.stun < 100;
                                global.log(5, "Do character specific attack", currentMonster.stunDo);
                            } else {
                                global.log(1, "Missing 'class', 'tip' or 'stun'", currentMonster);
                            }
                        } else {
                            global.log(1, "Missing tempText");
                        }
                    } else {
                        global.log(1, "Missing nm_bottom");
                    }

                    break;
                default:
                    global.log(1, "No match for defense_img", this.monsterInfo[currentMonster.type].defense_img);
                }
            }

            // Get damage done to monster
            tempDiv = $("td[class='dragonContainer'] td[valign='top'] a[href*='user=" + this.stats.FBID + "']");
            if (tempDiv && tempDiv.length) {
                if (currentMonster.type === "Serpent" || currentMonster.type.indexOf('Elemental') >= 0 || currentMonster.type === "Deathrune") {
                    tempArr = $.trim(tempDiv.parent().parent().siblings(":last").text()).match(new RegExp("([0-9,]+) dmg / ([0-9,]+) def"));
                    if (tempArr && tempArr.length === 3) {
                        currentMonster.attacked = this.NumberOnly(tempArr[1]);
                        currentMonster.defended = this.NumberOnly(tempArr[2]);
                        currentMonster.damage = currentMonster.attacked + currentMonster.defended;
                    } else {
                        global.log(1, "Unable to get attacked and defended damage");
                    }
                } else if (currentMonster.type === "Siege" || currentMonster.type.indexOf('Raid') >= 0) {
                    currentMonster.attacked = this.NumberOnly($.trim(tempDiv.parent().siblings(":last").text()));
                    currentMonster.damage = currentMonster.attacked;
                } else {
                    currentMonster.attacked = this.NumberOnly($.trim(tempDiv.parent().parent().siblings(":last").text()));
                    currentMonster.damage = currentMonster.attacked;
                }
            } else {
                global.log(1, "Player hasn't done damage yet");
            }

            if (/:ac\b/.test(currentMonster.conditions) ||
                    (currentMonster.type.match(/Raid/) && gm.getValue('raidCollectReward', false)) ||
                    (!currentMonster.type.match(/Raid/) && gm.getValue('monsterCollectReward', false))) {

                counter = gm.getNumber('monsterReviewCounter', -3);
                if (counter >= 0 && this.monsterArray[counter].name === currentMonster.name && ($("a[href*='&action=collectReward']").length || $("input[alt*='Collect Reward']").length)) {
                    global.log(1, 'Collecting Reward');
                    currentMonster.review = 1;
                    gm.setValue('monsterReviewCounter', counter -= 1);
                    currentMonster.status = 'Collect Reward';
                    if (currentMonster.name.indexOf('Siege') >= 0) {
                        if ($("a[href*='&rix=1']").length) {
                            currentMonster.rix = 1;
                        } else {
                            currentMonster.rix = 2;
                        }
                    }
                }
            }

            if (this.monsterInfo[currentMonster.type].alpha) {
                monstHealthImg = 'nm_red.jpg';
            } else {
                monstHealthImg = 'monster_health_background.jpg';
            }

            monsterDiv = $("img[src*='" + monstHealthImg + "']");
            if (time && time.length === 3 && monsterDiv && monsterDiv.length) {
                currentMonster.timeLeft = time[0] + ":" + time[1];
                if (monsterDiv && monsterDiv.length) {
                    global.log(2, "Found monster health div.");
                    currentMonster.life = parseFloat(monsterDiv.parent().css("width"));
                } else {
                    global.log(1, "Could not find monster health div.");
                }

                if (currentMonster.life) {
                    if (!this.monsterInfo[currentMonster.type]) {
                        this.updateMonsterRecord(currentMonster);
                        global.log(1, 'Unknown monster');
                        return;
                    }
                }

                if (this.monsterInfo[currentMonster.type] && this.monsterInfo[currentMonster.type].siege) {
                    if (this.monsterInfo[currentMonster.type].alpha) {
                        miss = $.trim($("div[style*='nm_bottom']").children(":last").children(":last").children(":last").children(":last").text()).replace(missRegEx, "$1");
                        totalCount = 0;
                        for (ind = 0; ind < this.monsterInfo[currentMonster.type].siege_img.length; ind += 1) {
                            totalCount += $("img[src*=" + this.monsterInfo[currentMonster.type].siege_img[ind] + "]").size();
                        }

                        currentPhase = Math.min(totalCount, this.monsterInfo[currentMonster.type].siege);
                    } else {
                        if (currentMonster.type.indexOf('Raid') >= 0) {
                            miss = $.trim($("img[src*=" + this.monsterInfo[currentMonster.type].siege_img + "]").parent().parent().text()).replace(missRegEx, "$1");
                        } else {
                            miss = $.trim($("#app46755028429_action_logs").prev().children().eq(3).children().eq(2).children().eq(1).text()).replace(missRegEx, "$1");
                        }

                        divSeigeLogs = document.getElementById("app46755028429_siege_log");
                        if (divSeigeLogs && !currentPhase) {
                            global.log(8, "Found siege logs.");
                            divSeigeCount = divSeigeLogs.getElementsByTagName("div").length;
                            if (divSeigeCount) {
                                currentPhase = Math.round(divSeigeCount / 4) + 1;
                            } else {
                                global.log(1, "Could not count siege logs.");
                            }
                        } else {
                            global.log(1, "Could not find siege logs.");
                        }
                    }

                    currentMonster.phase = Math.min(currentPhase, this.monsterInfo[currentMonster.type].siege) + "/" + this.monsterInfo[currentMonster.type].siege + " need " + (isNaN(miss) ? 0 : miss);
                }

                if (this.monsterInfo[currentMonster.type]) {
                    if (isNaN(miss)) {
                        miss = 0;
                    }

                    currentMonster.t2k = this.t2kCalc(this.monsterInfo[currentMonster.type], time, currentMonster.life, currentPhase, miss);
                }
            } else {
                global.log(1, 'Monster is dead or fled');
                currentMonster.color = 'grey';
                if (currentMonster.status !== 'Complete' && currentMonster.status !== 'Collect Reward') {
                    currentMonster.status = "Dead or Fled";
                }

                gm.setValue('resetselectMonster', true);
                this.updateMonsterRecord(currentMonster);
                return;
            }

            achLevel = this.parseCondition('ach', currentMonster.conditions);
            if (this.monsterInfo[currentMonster.type] && achLevel === false) {
                achLevel = this.monsterInfo[currentMonster.type].ach;
            }

            maxDamage = this.parseCondition('max', currentMonster.conditions);
            maxToFortify = (this.parseCondition('f%', currentMonster.conditions) !== false) ? this.parseCondition('f%', currentMonster.conditions) : gm.getNumber('MaxToFortify', 0);
            isTarget = (currentMonster.name === gm.getValue('targetFromraid', '') || currentMonster.name === gm.getValue('targetFrombattle_monster', '') || currentMonster.name === gm.getValue('targetFromfortify', ''));
            if (currentMonster.name === gm.getValue('targetFromfortify', '') && currentMonster.fortify > maxToFortify) {
                gm.setValue('resetselectMonster', true);
            }

            // Start of Keep On Budget (KOB) code Part 1 -- required variables
            global.log(1, 'Start of Keep On Budget (KOB) Code');

            //default is disabled for everything
            KOBenable = false;

            //default is zero bias hours for everything
            KOBbiasHours = 0;

            //KOB needs to follow achievment mode for this monster so that KOB can be skipped.
            KOBach = false;

            //KOB needs to follow max mode for this monster so that KOB can be skipped.
            KOBmax = false;

            //KOB needs to follow minimum fortification state for this monster so that KOB can be skipped.
            KOBminFort = false;

            //create a temp variable so we don't need to call parseCondition more than once for each if statement
            KOBtmp = this.parseCondition('kob', currentMonster.conditions);
            if (isNaN(KOBtmp)) {
                global.log(1, 'NaN branch');
                KOBenable = true;
                KOBbiasHours = 0;
            } else if (!KOBtmp) {
                global.log(1, 'false branch');
                KOBenable = false;
                KOBbiasHours = 0;
            } else {
                global.log(1, 'passed value branch');
                KOBenable = true;
                KOBbiasHours = KOBtmp;
            }

            //test if user wants kob active globally
            if (!KOBenable && gm.getValue('KOBAllMonters', false)) {
                KOBenable = true;
            }

            //disable kob if in level up mode or if we are within 5 stamina of max potential stamina
            if (this.InLevelUpMode() || this.stats.stamina.num >= this.stats.stamina.max - 5) {
                KOBenable = false;
            }
            global.log(1, 'Level Up Mode: ' + this.InLevelUpMode() + ' Stamina Avail: ' + this.stats.stamina.num + ' Stamina Max: ' + this.stats.stamina.max);

            //log results of previous two tests
            global.log(1, 'KOBenable: ' + KOBenable + ' KOB Bias Hours: ' + KOBbiasHours);

            //Total Time alotted for monster
            KOBtotalMonsterTime = this.monsterInfo[currentMonster.type].duration;
            global.log(1, 'Total Time for Monster: ', KOBtotalMonsterTime);

            //Total Damage remaining
            global.log(1, 'HP left: ', currentMonster.life);

            //Time Left Remaining
            KOBtimeLeft = parseInt(time[0], 10) + (parseInt(time[1], 10) * 0.0166);
            global.log(1, 'TimeLeft: ', KOBtimeLeft);

            //calculate the bias offset for time remaining
            KOBbiasedTF = KOBtimeLeft - KOBbiasHours;

            //for 7 day monsters we want kob to not permit attacks (beyond achievement level) for the first 24 to 48 hours
            // -- i.e. reach achievement and then wait for more players and siege assist clicks to catch up
            if (KOBtotalMonsterTime >= 168) {
                KOBtotalMonsterTime = KOBtotalMonsterTime - gm.getValue('KOBDelayStart', 48);
            }

            //Percentage of time remaining for the currently selected monster
            KOBPercentTimeRemaining = Math.round(KOBbiasedTF / KOBtotalMonsterTime * 1000) / 10;
            global.log(1, 'Percent Time Remaining: ', KOBPercentTimeRemaining);

            // End of Keep On Budget (KOB) code Part 1 -- required variables

            if (maxDamage && currentMonster.damage >= maxDamage) {
                currentMonster.color = 'red';
                currentMonster.over = 'max';
                //used with KOB code
                KOBmax = true;
                //used with kob debugging
                global.log(1, 'KOB - max activated');
                if (isTarget) {
                    gm.setValue('resetselectMonster', true);
                }
            } else if (currentMonster.fortify !== -1 && currentMonster.fortify < gm.getNumber('MinFortToAttack', 1)) {
                currentMonster.color = 'purple';
                //used with KOB code
                KOBminFort = true;
                //used with kob debugging
                global.log(1, 'KOB - MinFort activated');
                if (isTarget) {
                    gm.setValue('resetselectMonster', true);
                }
            } else if (currentMonster.damage >= achLevel && (gm.getValue('AchievementMode') || this.parseCondition('ach', currentMonster.conditions))) {
                currentMonster.color = 'orange';
                currentMonster.over = 'ach';
                //used with KOB code
                KOBach = true;
                //used with kob debugging
                global.log(1, 'KOB - achievement reached');
                if (isTarget && currentMonster.damage < achLevel) {
                    gm.setValue('resetselectMonster', true);
                }
            }

            //Start of KOB code Part 2 begins here
            if (KOBenable && !KOBmax && !KOBminFort && KOBach && currentMonster.life < KOBPercentTimeRemaining) {
                //kob color
                currentMonster.color = 'magenta';
                // this line is required or we attack anyway.
                currentMonster.over = 'max';
                //used with kob debugging
                global.log(1, 'KOB - budget reached');
                if (isTarget) {
                    gm.setValue('resetselectMonster', true);
                    global.log(1, 'This monster no longer a target due to kob');
                }

            } else {
                if (!KOBmax && !KOBminFort && !KOBach) {
                    //the way that the if statements got stacked, if it wasn't kob it was painted black anyway
                    //had to jump out the black paint if max, ach or fort needed to paint the entry.
                    currentMonster.color = 'black';
                }
            }
            //End of KOB code Part 2 stops here.

            this.updateMonsterRecord(currentMonster);
            this.UpdateDashboard(true);
            if (schedule.Check('battleTimer')) {
                window.setTimeout(function () {
                    caap.SetDivContent('monster_mess', '');
                }, 2000);
            }
        } catch (err) {
            global.error("ERROR in CheckResults_viewFight: " + err);
        }
    },

    selectMonster: function (force) {
        try {
            if (!(force || this.oneMinuteUpdate('selectMonster'))) {
                return false;
            }

            global.log(1, 'Selecting monster');
            // First we forget everything about who we already picked.
            gm.setValue('targetFrombattle_monster', '');
            gm.setValue('targetFromfortify', '');
            gm.setValue('targetFromraid', '');

            // Next we get our monster objects from the reposoitory and break them into separarte lists
            // for monster or raid.  If we are serializing then we make one list only.
            var monsterList  = {
                    battle_monster : [],
                    raid           : [],
                    any            : []
                },
                it                 = 0,
                s                  = 0,
                selectTypes        = [],
                maxToFortify       = 0,
                nodeNum            = 0,
                firstOverAch       = '',
                firstUnderMax      = '',
                firstFortOverAch   = '',
                firstFortUnderMax  = '',
                firstStunOverAch   = '',
                firstStunUnderMax  = '',
                monster            = '',
                monsterObj         = {},
                monsterConditions  = '',
                monstType          = '',
                p                  = 0,
                m                  = 0,
                attackOrderList    = [];


            for (it = 0; it < this.monsterArray.length; it += 1) {
                this.monsterArray[it].conditions = 'none';
                if (gm.getValue('SerializeRaidsAndMonsters', false)) {
                    monsterList.any.push(this.monsterArray[it].name);
                } else if ((this.monsterArray[it].page === 'raid') || (this.monsterArray[it].page === 'battle_monster')) {
                    monsterList[this.monsterArray[it].page].push(this.monsterArray[it].name);
                }
            }

            //PLEASE NOTE BEFORE CHANGING
            //The Serialize Raids and Monsters dictates a 'single-pass' because we only need select
            //one "targetFromxxxx" to fill in. The other MUST be left blank. This is what keeps it
            //serialized!!! Trying to make this two pass logic is like trying to fit a square peg in
            //a round hole. Please reconsider before doing so.
            if (gm.getValue('SerializeRaidsAndMonsters', false)) {
                selectTypes = ['any'];
            } else {
                selectTypes = ['battle_monster', 'raid'];
            }

            global.log(1, 'monsterArray/monsterList/selectTypes', this.monsterArray, monsterList, selectTypes);
            // We loop through for each selection type (only once if serialized between the two)
            // We then read in the users attack order list
            for (s in selectTypes) {
                if (selectTypes.hasOwnProperty(s)) {
                    // The extra apostrophe at the end of attack order makes it match any "soandos's monster" so it always selects a monster if available
                    if (selectTypes[s] === 'any') {
                        attackOrderList = gm.getList('orderbattle_monster');
                        $.merge(attackOrderList, gm.getList('orderraid').concat('your', "'"));
                    } else {
                        attackOrderList = gm.getList('order' + selectTypes[s]).concat('your', "'");
                    }

                    global.log(9, 'attackOrderList', attackOrderList);
                    // Next we step through the users list getting the name and conditions
                    for (p in attackOrderList) {
                        if (attackOrderList.hasOwnProperty(p)) {
                            if (!($.trim(attackOrderList[p]))) {
                                continue;
                            }

                            monsterConditions = $.trim(attackOrderList[p].replace(new RegExp("^[^:]+"), '').toString());
                            // Now we try to match the users name agains our list of monsters
                            for (m in monsterList[selectTypes[s]]) {
                                if (monsterList[selectTypes[s]].hasOwnProperty(m)) {
                                    monsterObj = this.getMonsterRecord(monsterList[selectTypes[s]][m]);
                                    // If we set conditions on this monster already then we do not reprocess
                                    if (monsterObj.conditions !== 'none') {
                                        continue;
                                    }

                                    //If this monster does not match, skip to next one
                                    // Or if this monster is dead, skip to next one
                                    // Or if this monster is not the correct type, skip to next one
                                    if (monsterList[selectTypes[s]][m].toLowerCase().indexOf($.trim(attackOrderList[p].match(new RegExp("^[^:]+")).toString()).toLowerCase()) < 0 || (selectTypes[s] !== 'any' && monsterObj.page !== selectTypes[s])) {
                                        continue;
                                    }

                                    //Monster is a match so we set the conditions
                                    monsterObj.conditions = monsterConditions;

                                    //monsterObj.over = '';
                                    this.updateMonsterRecord(monsterObj);

                                    // If it's complete or collect rewards, no need to process further
                                    if (monsterObj.color === 'grey') {
                                        continue;
                                    }

                                    // checkMonsterDamage would have set our 'color' and 'over' values. We need to check
                                    // these to see if this is the monster we should select
                                    if (!firstUnderMax && monsterObj.color !== 'purple') {
                                        if (monsterObj.over === 'ach') {
                                            if (!firstOverAch) {
                                                firstOverAch = monsterList[selectTypes[s]][m];
                                                global.log(3, 'firstOverAch', firstOverAch);
                                            }
                                        } else if (monsterObj.over !== 'max') {
                                            firstUnderMax = monsterList[selectTypes[s]][m];
                                            global.log(3, 'firstUnderMax', firstUnderMax);
                                        }
                                    }

                                    maxToFortify = (this.parseCondition('f%', monsterConditions) !== false) ? this.parseCondition('f%', monsterConditions) : gm.getNumber('MaxToFortify', 0);
                                    monstType = this.getMonstType(monsterList[selectTypes[s]][m]);
                                    if (this.monsterInfo[monstType] && (!this.monsterInfo[monstType].alpha || (this.monsterInfo[monstType].alpha && (monsterObj.charClass === 'Warrior' || monsterObj.charClass === 'Cleric' || monsterObj.charClass === 'Warlock' || monsterObj.charClass === 'Ranger')))) {
                                        if (!firstFortUnderMax && monsterObj.fortify < maxToFortify && monsterObj.page === 'battle_monster' && this.monsterInfo[monstType] && this.monsterInfo[monstType].fort) {
                                            if (monsterObj.over === 'ach') {
                                                if (!firstFortOverAch) {
                                                    firstFortOverAch = monsterList[selectTypes[s]][m];
                                                    global.log(3, 'firstFortOverAch', firstFortOverAch);
                                                }
                                            } else if (monsterObj.over !== 'max') {
                                                firstFortUnderMax = monsterList[selectTypes[s]][m];
                                                global.log(3, 'firstFortUnderMax', firstFortUnderMax);
                                            }
                                        }
                                    }

                                    if (this.monsterInfo[monstType] && this.monsterInfo[monstType].alpha) {
                                        if (!firstStunUnderMax && monsterObj.stunDo && monsterObj.page === 'battle_monster') {
                                            if (monsterObj.over === 'ach') {
                                                if (!firstStunOverAch) {
                                                    firstStunOverAch = monsterList[selectTypes[s]][m];
                                                    global.log(1, 'firstStunOverAch', firstStunOverAch);
                                                }
                                            } else if (monsterObj.over !== 'max') {
                                                firstStunUnderMax = monsterList[selectTypes[s]][m];
                                                global.log(1, 'firstStunUnderMax', firstStunUnderMax);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Now we use the first under max/under achievement that we found. If we didn't find any under
                    // achievement then we use the first over achievement
                    if (selectTypes[s] !== 'raid') {
                        gm.setValue('targetFromfortify', firstFortUnderMax);
                        if (!gm.getValue('targetFromfortify', '')) {
                            gm.setValue('targetFromfortify', firstFortOverAch);
                        }


                        global.log(1, 'fort under max ', firstFortUnderMax);
                        global.log(1, 'fort over Ach ', firstFortOverAch);
                        global.log(1, 'fort target ', gm.getValue('targetFromfortify', ''));

                        gm.setValue('targetFromStun', firstStunUnderMax);
                        if (!gm.getValue('targetFromStun', '')) {
                            gm.setValue('targetFromStun', firstStunOverAch);
                        }

                        global.log(1, 'stun under max ', firstStunUnderMax);
                        global.log(1, 'stun over Ach ', firstStunOverAch);
                        global.log(1, 'stun target ', gm.getValue('targetFromStun', ''));

                        if (gm.getValue('targetFromStun', '')) {
                            gm.setValue('targetFromfortify', gm.getValue('targetFromStun', ''));
                            global.log(1, 'Stun target replaces fortify ', gm.getValue('targetFromfortify', ''));
                        }
                    }

                    monster = firstUnderMax;
                    if (!monster) {
                        monster = firstOverAch;
                    }

                    global.log(1, 'monster', monster);
                    // If we've got a monster for this selection type then we set the GM variables for the name
                    // and stamina requirements
                    if (monster) {
                        monsterObj = this.getMonsterRecord(monster);
                        gm.setValue('targetFrom' + monsterObj.page, monster);
                        if (monsterObj.page === 'battle_monster') {
                            nodeNum = 0;
                            if (!this.InLevelUpMode() && this.monsterInfo[monsterObj.type] && this.monsterInfo[monsterObj.type].staLvl) {
                                for (nodeNum = this.monsterInfo[monsterObj.type].staLvl.length - 1; nodeNum >= 0; nodeNum -= 1) {
                                    global.log(9, 'stamina.max:nodeNum:staLvl', this.stats.stamina.max, nodeNum, this.monsterInfo[monsterObj.type].staLvl[nodeNum]);
                                    if (this.stats.stamina.max >= this.monsterInfo[monsterObj.type].staLvl[nodeNum]) {
                                        break;
                                    }
                                }
                            }

                            global.log(8, 'MonsterStaminaReq:Info', monsterObj.type, nodeNum, this.monsterInfo[monsterObj.type]);
                            if (!this.InLevelUpMode() && this.monsterInfo[monsterObj.type] && this.monsterInfo[monsterObj.type].staMax && gm.getValue('PowerAttack') && gm.getValue('PowerAttackMax')) {
                                global.log(7, 'MonsterStaminaReq:PowerAttackMax', this.monsterInfo[monsterObj.type].staMax[nodeNum]);
                                gm.setValue('MonsterStaminaReq', this.monsterInfo[monsterObj.type].staMax[nodeNum]);
                            } else if (this.monsterInfo[monsterObj.type] && this.monsterInfo[monsterObj.type].staUse) {
                                global.log(7, 'MonsterStaminaReq:staUse', this.monsterInfo[monsterObj.type].staUse);
                                gm.setValue('MonsterStaminaReq', this.monsterInfo[monsterObj.type].staUse);
                            } else if ((this.InLevelUpMode() && this.stats.stamina.num >= 10) || monsterObj.conditions.match(/:pa/i)) {
                                global.log(7, 'MonsterStaminaReq:pa', 5);
                                gm.setValue('MonsterStaminaReq', 5);
                            } else if (monsterObj.conditions.match(/:sa/i)) {
                                global.log(7, 'MonsterStaminaReq:sa', 1);
                                gm.setValue('MonsterStaminaReq', 1);
                            } else if ((this.InLevelUpMode() && this.stats.stamina.num >= 10) || gm.getValue('PowerAttack', true)) {
                                global.log(7, 'MonsterStaminaReq:PowerAttack', 5);
                                gm.setValue('MonsterStaminaReq', 5);
                            } else {
                                global.log(7, 'MonsterStaminaReq:default', 1);
                                gm.setValue('MonsterStaminaReq', 1);
                            }

                            global.log(2, 'MonsterStaminaReq:MonsterGeneral', gm.getValue('MonsterGeneral', 'Strider'));
                            if (gm.getValue('MonsterGeneral', 'Strider') === 'Orc King') {
                                global.log(2, 'MonsterStaminaReq:Orc King', gm.getValue('MonsterStaminaReq', 1) * 5);
                                gm.setValue('MonsterStaminaReq', gm.getValue('MonsterStaminaReq', 1) * 5);
                            }

                            if (gm.getValue('MonsterGeneral', 'Strider') === 'Barbarus') {
                                global.log(2, 'MonsterStaminaReq:Barbarus', gm.getValue('MonsterStaminaReq', 1) * 3);
                                gm.setValue('MonsterStaminaReq', gm.getValue('MonsterStaminaReq', 1) * 3);
                            }
                        } else {
                            // Switch RaidPowerAttack
                            global.log(8, 'RaidStaminaReq:Info', monsterObj.type, this.monsterInfo[monsterObj.type]);
                            if (gm.getValue('RaidPowerAttack', false) || monsterObj.conditions.match(/:pa/i)) {
                                global.log(7, 'RaidStaminaReq:pa', 5);
                                gm.setValue('RaidStaminaReq', 5);
                            } else if (this.monsterInfo[monsterObj.type] && this.monsterInfo[monsterObj.type].staUse) {
                                global.log(7, 'RaidStaminaReq:staUse', this.monsterInfo[monsterObj.type].staUse);
                                gm.setValue('RaidStaminaReq', this.monsterInfo[monsterObj.type].staUse);
                            } else {
                                global.log(7, 'RaidStaminaReq:default', 1);
                                gm.setValue('RaidStaminaReq', 1);
                            }
                        }
                    }
                }
            }

            this.UpdateDashboard(true);
            return true;
        } catch (err) {
            global.error("ERROR in selectMonster: " + err);
            return false;
        }
    },

    monsterConfirmRightPage: function (monster) {
        try {
            // Confirm name and type of monster
            var monsterDiv = null,
                tempDiv    = null,
                tempText   = '';

            monsterDiv = $("div[style*='dragon_title_owner']");
            if (monsterDiv && monsterDiv.length) {
                tempText = $.trim(monsterDiv.children(":eq(2)").text());
            } else {
                monsterDiv = $("div[style*='nm_top']");
                if (monsterDiv && monsterDiv.length) {
                    tempText = $.trim(monsterDiv.children(":eq(0)").children(":eq(0)").text());
                    tempDiv = $("div[style*='nm_bars']");
                    if (tempDiv && tempDiv.length) {
                        tempText += ' ' + $.trim(tempDiv.children(":eq(0)").children(":eq(0)").children(":eq(0)").siblings(":last").children(":eq(0)").text()).replace("'s Life", "");
                    } else {
                        global.log(1, "Problem finding nm_bars");
                        return false;
                    }
                } else {
                    global.log(1, "Problem finding dragon_title_owner and nm_top");
                    return false;
                }
            }

            if (monsterDiv.find("img[uid='" + this.stats.FBID + "']").length) {
                global.log(1, "monster name found");
                tempText = tempText.replace(new RegExp(".+'s "), 'Your ');
            }

            if (monster !== tempText) {
                global.log(1, 'Looking for ' + monster + ' but on ' + tempText + '. Going back to select screen');
                return this.NavigateTo('keep,' + this.getMonsterRecord(monster).page);
            }

            return false;
        } catch (err) {
            global.error("ERROR in monsterConfirmRightPage: " + err);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    MonsterReview is a primary action subroutine to mange the monster and raid list
    on the dashboard
    \-------------------------------------------------------------------------------------*/
    MonsterReview: function () {
        try {
            /*-------------------------------------------------------------------------------------\
            We do monster review once an hour.  Some routines may reset this timer to drive
            MonsterReview immediately.
            \-------------------------------------------------------------------------------------*/
            if (!schedule.Check("monsterReview") || (gm.getValue('WhenMonster') === 'Never' && gm.getValue('WhenBattle') === 'Never')) {
                return false;
            }

            /*-------------------------------------------------------------------------------------\
            We get the monsterReviewCounter.  This will be set to -3 if we are supposed to refresh
            the monsterOl completely. Otherwise it will be our index into how far we are into
            reviewing monsterOl.
            \-------------------------------------------------------------------------------------*/
            var counter = parseInt(gm.getValue('monsterReviewCounter', -3), 10),
                link    = '';

            if (counter === -3) {
                gm.setValue('monsterReviewCounter', counter += 1);
                return true;
            }

            if (counter === -2) {
                if (this.NavigateTo('battle_monster', 'tab_monster_list_on.gif')) {
                    gm.setValue('reviewDone', 0);
                    return true;
                }

                if (gm.getValue('reviewDone', 1) > 0) {
                    gm.setValue('monsterReviewCounter', counter += 1);
                } else {
                    return true;
                }
            }

            if (counter === -1) {
                if (this.NavigateTo(this.battlePage + ',raid', 'tab_raid_on.gif')) {
                    gm.setValue('reviewDone', 0);
                    return true;
                }

                if (gm.getValue('reviewDone', 1) > 0) {
                    gm.setValue('monsterReviewCounter', counter += 1);
                } else {
                    return true;
                }
            }

            if (this.monsterArray && this.monsterArray.length === 0) {
                return false;
            }

            /*-------------------------------------------------------------------------------------\
            Now we step through the monsterOl objects. We set monsterReviewCounter to the next
            index for the next reiteration since we will be doing a click and return in here.
            \-------------------------------------------------------------------------------------*/
            while (counter < this.monsterArray.length) {
                if (!this.monsterArray[counter]) {
                    gm.setValue('monsterReviewCounter', counter += 1);
                    continue;
                }
                /*-------------------------------------------------------------------------------------\
                If we looked at this monster more recently than an hour ago, skip it
                \-------------------------------------------------------------------------------------*/
                if (this.monsterArray[counter].color === 'grey' && this.monsterArray[counter].life !== -1) {
                    this.monsterArray[counter].life = -1;
                    this.monsterArray[counter].fortify = -1;
                    this.monsterArray[counter].strength = -1;
                    this.monsterArray[counter].timeLeft = '';
                    this.monsterArray[counter].t2k = -1;
                    this.monsterArray[counter].phase = '';
                }

                if (this.monsterArray[counter].status === 'Complete' || !this.WhileSinceDidIt(this.monsterArray[counter].review, 60 * 60) || gm.getValue('monsterRepeatCount', 0) > 2) {
                    gm.setValue('monsterReviewCounter', counter += 1);
                    gm.setValue('monsterRepeatCount', 0);
                    continue;
                }
                /*-------------------------------------------------------------------------------------\
                We get our monster link
                \-------------------------------------------------------------------------------------*/
                this.SetDivContent('monster_mess', 'Reviewing/sieging ' + (counter + 1) + '/' + this.monsterArray.length + ' ' + this.monsterArray[counter].name);
                link = this.monsterArray[counter].link;
                /*-------------------------------------------------------------------------------------\
                If the link is good then we get the url and any conditions for monster
                \-------------------------------------------------------------------------------------*/
                if (/href/.test(link)) {
                    link = link.split("'")[1];
                    /*-------------------------------------------------------------------------------------\
                    If the autocollect token was specified then we set the link to do auto collect. If
                    the conditions indicate we should not do sieges then we fix the link.
                    \-------------------------------------------------------------------------------------*/
                    if ((((this.monsterArray[counter].conditions) && (/:ac\b/.test(this.monsterArray[counter].conditions))) ||
                            (this.monsterArray[counter].type.match(/Raid/) && gm.getValue('raidCollectReward', false)) ||
                            (!this.monsterArray[counter].type.match(/Raid/) && gm.getValue('monsterCollectReward', false))) && this.monsterArray[counter].status === 'Collect Reward') {

                        if (general.Select('CollectGeneral')) {
                            return true;
                        }

                        link += '&action=collectReward';
                        if (this.monsterArray[counter].name.indexOf('Siege') >= 0) {
                            if (this.monsterArray[counter].rix !== -1)  {
                                link += '&rix=' + this.monsterArray[counter].rix;
                            } else {
                                link += '&rix=2';
                            }
                        }

                        link = link.replace('&action=doObjective', '');
                    } else if (((this.monsterArray[counter].conditions) && (this.monsterArray[counter].conditions.match(':!s'))) ||
                               (!gm.getValue('raidDoSiege', true) && this.monsterArray[counter].type.match(/Raid/)) ||
                               (!gm.getValue('monsterDoSiege', true) && !this.monsterArray[counter].type.match(/Raid/) && this.monsterInfo[this.monsterArray[counter].type].siege) ||
                               this.stats.stamina.num === 0) {
                        link = link.replace('&action=doObjective', '');
                    }
                    /*-------------------------------------------------------------------------------------\
                    Now we use ajaxSendLink to display the monsters page.
                    \-------------------------------------------------------------------------------------*/
                    global.log(1, 'Reviewing ' + (counter + 1) + '/' + this.monsterArray.length + ' ' + this.monsterArray[counter].name);
                    gm.setValue('ReleaseControl', true);
                    link = link.replace('http://apps.facebook.com/castle_age/', '');
                    link = link.replace('?', '?twt2&');
                    global.log(9, "Link", link);
                    this.ClickAjax(link);
                    gm.setValue('monsterRepeatCount', gm.getValue('monsterRepeatCount', 0) + 1);
                    gm.setValue('resetselectMonster', true);
                    return true;
                }
            }
            /*-------------------------------------------------------------------------------------\
            All done.  Set timer and tell selectMonster and dashboard they need to do thier thing.
            We set the monsterReviewCounter to do a full refresh next time through.
            \-------------------------------------------------------------------------------------*/
            schedule.Set("monsterReview", gm.getValue('monsterReviewMins', 60) * 60, 300);
            gm.setValue('resetselectMonster', true);
            gm.setValue('monsterReviewCounter', -3);
            global.log(1, 'Done with monster/raid review.');
            this.SetDivContent('monster_mess', '');
            this.UpdateDashboard(true);
            return true;
        } catch (err) {
            global.error("ERROR in MonsterReview: " + err);
            return false;
        }
    },

    Monsters: function () {
        try {
            if (gm.getValue('WhenMonster', '') === 'Never') {
                this.SetDivContent('monster_mess', 'Monster off');
                return false;
            }

            ///////////////// Reivew/Siege all monsters/raids \\\\\\\\\\\\\\\\\\\\\\

            if (gm.getValue('WhenMonster') === 'Stay Hidden' && this.NeedToHide() && this.CheckStamina('Monster', 1)) {
                global.log(1, "Stay Hidden Mode: We're not safe. Go battle.");
                this.SetDivContent('monster_mess', 'Not Safe For Monster. Battle!');
                return false;
            }

            if (!schedule.Check('NotargetFrombattle_monster')) {
                return false;
            }

            ///////////////// Individual Monster Page \\\\\\\\\\\\\\\\\\\\\\

            // Establish a delay timer when we are 1 stamina below attack level.
            // Timer includes 5 min for stamina tick plus user defined random interval
            if (!this.InLevelUpMode() && this.stats.stamina.num === (gm.getNumber('MonsterStaminaReq', 1) - 1) && schedule.Check('battleTimer') && gm.getNumber('seedTime', 0) > 0) {
                schedule.Set('battleTimer', 300, gm.getValue('seedTime', 0));
                this.SetDivContent('monster_mess', 'Monster Delay Until ' + schedule.Display('battleTimer'));
                return false;
            }

            if (!schedule.Check('battleTimer')) {
                if (this.stats.stamina.num < gm.getNumber('MaxIdleStamina', this.stats.stamina.max)) {
                    this.SetDivContent('monster_mess', 'Monster Delay Until ' + schedule.Display('battleTimer'));
                    return false;
                }
            }

            var fightMode = '';
            // Check to see if we should fortify, attack monster, or battle raid
            var monster = gm.getValue('targetFromfortify');
            var monstType = this.getMonstType(monster);
            var nodeNum = 0;
            var staLvl = null;
            var energyRequire = 10;
            var currentMonster = this.getMonsterRecord(monster);

            if (monstType) {
                staLvl = this.monsterInfo[monstType].staLvl;
                if (!this.InLevelUpMode() && gm.getValue('PowerFortifyMax') && staLvl) {
                    for (nodeNum = this.monsterInfo[monstType].staLvl.length - 1; nodeNum >= 0; nodeNum -= 1) {
                        if (this.stats.stamina.max >= this.monsterInfo[monstType].staLvl[nodeNum]) {
                            break;
                        }
                    }
                }

                if (nodeNum >= 0 && nodeNum !== null && nodeNum !== undefined && gm.getValue('PowerAttackMax')) {
                    energyRequire = this.monsterInfo[monstType].nrgMax[nodeNum];
                }
            }

            global.log(9, "Energy Required/Node", energyRequire, nodeNum);
            if (gm.getValue('FortifyGeneral', 'Strider') === 'Orc King') {
                energyRequire = energyRequire * 5;
                global.log(2, 'Monsters Fortify:Orc King', energyRequire);
            }

            if (gm.getValue('FortifyGeneral', 'Strider') === 'Barbarus') {
                energyRequire = energyRequire * 3;
                global.log(2, 'Monsters Fortify:Barbarus', energyRequire);
            }

            if (monster && this.CheckEnergy(energyRequire, gm.getValue('WhenFortify', 'Energy Available'), 'fortify_mess')) {
                fightMode = gm.setValue('fightMode', 'Fortify');
            } else {
                monster = gm.getValue('targetFrombattle_monster');
                currentMonster = this.getMonsterRecord(monster);
                if (monster && this.CheckStamina('Monster', gm.getValue('MonsterStaminaReq', 1)) && currentMonster.page === 'battle_monster') {
                    fightMode = gm.setValue('fightMode', 'Monster');
                } else {
                    schedule.Set('NotargetFrombattle_monster', 60);
                    return false;
                }
            }

            // Set right general
            if (general.Select(fightMode + 'General')) {
                return true;
            }

            monstType = this.getMonstType(monster);
            // Check if on engage monster page
            var imageTest = '';
            if (this.monsterInfo[monstType].alpha) {
                imageTest = 'nm_top';
            } else {
                imageTest = 'dragon_title_owner';
            }

            if ($("div[style*='" + imageTest + "']").length) {
                if (this.monsterConfirmRightPage(monster)) {
                    return true;
                }

                var attackButton = null;
                var singleButtonList = [
                    'button_nm_p_attack.gif',
                    'attack_monster_button.jpg',
                    'event_attack1.gif',
                    'seamonster_attack.gif',
                    'event_attack2.gif',
                    'attack_monster_button2.jpg'
                ];
                var buttonList = [];
                // Find the attack or fortify button
                if (fightMode === 'Fortify') {
                    buttonList = [
                        'seamonster_fortify.gif',
                        "button_nm_s_",
                        'button_dispel.gif',
                        'attack_monster_button3.jpg'
                    ];
                } else if (gm.getValue('MonsterStaminaReq', 1) === 1) {
                    // not power attack only normal attacks
                    buttonList = singleButtonList;
                } else {
                    var monsterConditions = currentMonster.conditions,
                        tacticsValue      = 0,
                        partyHealth       = 0,
                        useTactics        = false;

                    if (gm.getValue('UseTactics', false)) {
                        useTactics = true;
                        tacticsValue = gm.getValue('TacticsThreshold', false);
                    }

                    if (monsterConditions && monsterConditions.match(/:tac/i)) {
                        useTactics = true;
                        tacticsValue = this.parseCondition("tac%", monsterConditions);
                    }

                    if (useTactics) {
                        partyHealth = currentMonster.fortify;
                    }

                    if (tacticsValue !== false && partyHealth < tacticsValue) {
                        global.log(1, "Party health is below threshold value", partyHealth, tacticsValue);
                        useTactics = false;
                    }

                    if (useTactics && this.CheckForImage('nm_button_tactics.gif')) {
                        global.log(1, "Attacking monster using tactics buttons");
                        buttonList = [
                            'nm_button_tactics.gif'
                        ].concat(singleButtonList);
                    } else {
                        global.log(1, "Attacking monster using regular buttons");
                        // power attack or if not seamonster power attack or if not regular attack -
                        // need case for seamonster regular attack?
                        buttonList = [
                            'button_nm_p_power',
                            'button_nm_p_',
                            'power_button_',
                            'attack_monster_button2.jpg',
                            'event_attack2.gif',
                            'seamonster_power.gif',
                            'event_attack1.gif',
                            'attack_monster_button.jpg'
                        ].concat(singleButtonList);
                    }
                }

                nodeNum = 0;
                staLvl = this.monsterInfo[monstType].staLvl;
                if (!this.InLevelUpMode()) {
                    if (((fightMode === 'Fortify' && gm.getValue('PowerFortifyMax')) || (fightMode !== 'Fortify' && gm.getValue('PowerAttack') && gm.getValue('PowerAttackMax'))) && staLvl) {
                        for (nodeNum = this.monsterInfo[monstType].staLvl.length - 1; nodeNum >= 0; nodeNum -= 1) {
                            if (this.stats.stamina.max >= this.monsterInfo[monstType].staLvl[nodeNum]) {
                                break;
                            }
                        }
                    }
                }

                /*
                if (fightMode === 'Fortify' && gm.getValue('PowerFortifyMax')) {
                    nodeNum += 1;
                }
                */

                for (var i in buttonList) {
                    if (buttonList.hasOwnProperty(i)) {
                        attackButton = this.CheckForImage(buttonList[i], null, null, nodeNum);
                        if (attackButton) {
                            break;
                        }
                    }
                }

                if (attackButton) {
                    var attackMess = '';
                    if (fightMode === 'Fortify') {
                        attackMess = 'Fortifying ' + monster;
                    } else {
                        attackMess = (gm.getValue('MonsterStaminaReq', 1) >= 5 ? 'Power' : 'Single') + ' Attacking ' + monster;
                    }

                    global.log(1, attackMess);
                    this.SetDivContent('monster_mess', attackMess);
                    gm.setValue('ReleaseControl', true);
                    this.Click(attackButton, 8000);
                    return true;
                } else {
                    global.log(1, 'ERROR - No button to attack/fortify with.');
                    schedule.Set('NotargetFrombattle_monster', 60);
                    return false;
                }
            }

            ///////////////// Check For Monster Page \\\\\\\\\\\\\\\\\\\\\\

            if (this.NavigateTo('keep,battle_monster', 'tab_monster_list_on.gif')) {
                return true;
            }

            if (gm.getValue('clearCompleteMonsters', false) && this.completeButton.battle_monster) {
                this.Click(this.completeButton.battle_monster, 1000);
                global.log(1, 'Cleared a completed monster');
                this.completeButton.battle_monster = '';
                return true;
            }

            var firstMonsterButtonDiv = this.CheckForImage('dragon_list_btn_');
            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + this.stats.FBID) ||
                    firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                var pageUserCheck = gm.getValue('pageUserCheck', '');
                if (pageUserCheck) {
                    global.log(1, "On another player's keep.", pageUserCheck);
                    return this.NavigateTo('keep,battle_monster');
                }
            }

            var engageButton = this.monsterEngageButtons[monster];
            if (engageButton) {
                this.SetDivContent('monster_mess', 'Opening ' + monster);
                this.Click(engageButton);
                return true;
            } else {
                schedule.Set('NotargetFrombattle_monster', 60);
                global.log(1, 'No "Engage" button for ' + monster);
                return false;
            }
        } catch (err) {
            global.error("ERROR in Monsters: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          COMMON FIGHTING FUNCTIONS
    /////////////////////////////////////////////////////////////////////

    demi: {
        ambrosia : {
            power : {
                total : 0,
                max   : 0,
                next  : 0
            },
            daily : {
                num : 0,
                max : 0,
                dif : 0
            }
        },
        malekus : {
            power : {
                total : 0,
                max   : 0,
                next  : 0
            },
            daily : {
                num : 0,
                max : 0,
                dif : 0
            }
        },
        corvintheus : {
            power : {
                total : 0,
                max   : 0,
                next  : 0
            },
            daily : {
                num : 0,
                max : 0,
                dif : 0
            }
        },
        aurora : {
            power : {
                total : 0,
                max   : 0,
                next  : 0
            },
            daily : {
                num : 0,
                max : 0,
                dif : 0
            }
        },
        azeron : {
            power : {
                total : 0,
                max   : 0,
                next  : 0
            },
            daily : {
                num : 0,
                max : 0,
                dif : 0
            }
        }
    },

    LoadDemi: function () {
        $.extend(this.demi, gm.getJValue('demiStats'));
        global.log(2, 'Demi', this.demi);
    },

    SaveDemi: function () {
        gm.setJValue('demiStats', this.demi);
        global.log(2, 'Demi', this.demi);
    },

    demiTable: {
        0 : 'ambrosia',
        1 : 'malekus',
        2 : 'corvintheus',
        3 : 'aurora',
        4 : 'azeron'
    },

    CheckResults_battle: function () {
        try {
            var symDiv  = null,
                points  = [],
                success = true;

            symDiv = $("#app46755028429_app_body img[src*='symbol_tiny_']").not("img[src*='rewards.jpg']");
            if (symDiv && symDiv.length === 5) {
                symDiv.each(function (index) {
                    var temp = $(this).parent().parent().next().text().replace(/\s/g, '');
                    if (temp) {
                        points.push(temp);
                    } else {
                        success = false;
                        global.log(1, 'Demi temp text problem', temp);
                    }
                });

                global.log(2, 'Points', points);
                if (success) {
                    this.demi.ambrosia.daily = this.GetStatusNumbers(points[0]);
                    this.demi.malekus.daily = this.GetStatusNumbers(points[1]);
                    this.demi.corvintheus.daily = this.GetStatusNumbers(points[2]);
                    this.demi.aurora.daily = this.GetStatusNumbers(points[3]);
                    this.demi.azeron.daily = this.GetStatusNumbers(points[4]);
                    schedule.Set("battle", gm.getValue('CheckDemi', 6) * 3600, 300);
                    this.SaveDemi();
                }
            } else {
                global.log(1, 'Demi symDiv problem', symDiv);
            }

            return true;
        } catch (err) {
            global.error("ERROR in CheckResults_battle: " + err);
            return false;
        }
    },

    DemiPoints: function () {
        try {
            if (!gm.getValue('DemiPointsFirst', false) || gm.getValue('WhenMonster') === 'Never') {
                return false;
            }

            if (!schedule.Check("battle")) {
                return this.NavigateTo(this.battlePage, 'battle_on.gif');
            }

            var demiPower      = 0,
                demiPointsDone = true;

            for (demiPower in this.demi) {
                if (this.demi.hasOwnProperty(demiPower)) {
                    if (this.demi[demiPower].daily.dif > 0) {
                        demiPointsDone = false;
                        break;
                    }
                }
            }

            global.log(1, 'DemiPointsDone', demiPointsDone);
            gm.setValue('DemiPointsDone', demiPointsDone);
            if (!demiPointsDone) {
                return this.Battle('DemiPoints');
            }

            global.log(1, 'DemiPoints here');
            return false;
        } catch (err) {
            global.error("ERROR in DemiPoints: " + err);
            return false;
        }
    },

    minutesBeforeLevelToUseUpStaEnergy : 5,

    InLevelUpMode: function () {
        try {
            if (!gm.getValue('EnableLevelUpMode', true)) {
                //if levelup mode is false then new level up mode is also false (kob)
                this.newLevelUpMode = false;
                return false;
            }

            if (!(this.stats.indicators.enl) || (this.stats.indicators.enl).toString().match(new Date(2009, 1, 1).getTime())) {
                //if levelup mode is false then new level up mode is also false (kob)
                this.newLevelUpMode = false;
                return false;
            }

            if (((this.stats.indicators.enl - new Date().getTime()) < this.minutesBeforeLevelToUseUpStaEnergy * 60 * 1000) || (this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0))) {
                //detect if we are entering level up mode for the very first time (kob)
                if (!this.newLevelUpMode) {
                    //set the current level up mode flag so that we don't call refresh monster routine more than once (kob)
                    this.newLevelUpMode = true;
                    this.refreshMonstersListener();
                }

                return true;
            }

            //if levelup mode is false then new level up mode is also false (kob)
            this.newLevelUpMode = false;
            return false;
        } catch (err) {
            global.error("ERROR in InLevelUpMode: " + err);
            return false;
        }
    },

    CheckStamina: function (battleOrBattle, attackMinStamina) {
        try {
            global.log(9, "CheckStamina", battleOrBattle, attackMinStamina);
            if (!attackMinStamina) {
                attackMinStamina = 1;
            }

            var when = gm.getValue('When' + battleOrBattle, '');
            if (when === 'Never') {
                return false;
            }

            if (!this.stats.stamina || !this.stats.health) {
                this.SetDivContent('battle_mess', 'Health or stamina not known yet.');
                return false;
            }

            if (this.stats.health.num < 10) {
                this.SetDivContent('battle_mess', "Need health to fight: " + this.stats.health.num + "/10");
                return false;
            }

            if (when === 'At X Stamina') {
                if (this.InLevelUpMode() && this.stats.stamina.num >= attackMinStamina) {
                    this.SetDivContent('battle_mess', 'Burning stamina to level up');
                    return true;
                }

                var staminaMF = battleOrBattle + 'Stamina';
                if (gm.getValue('BurnMode_' + staminaMF, false) || this.stats.stamina.num >= gm.getValue('X' + staminaMF, 1)) {
                    if (this.stats.stamina.num < attackMinStamina || this.stats.stamina.num <= gm.getValue('XMin' + staminaMF, 0)) {
                        gm.setValue('BurnMode_' + staminaMF, false);
                        return false;
                    }

                    //this.SetDivContent('battle_mess', 'Burning stamina');
                    gm.setValue('BurnMode_' + staminaMF, true);
                    return true;
                } else {
                    gm.setValue('BurnMode_' + staminaMF, false);
                }

                this.SetDivContent('battle_mess', 'Waiting for stamina: ' + this.stats.stamina.num + "/" + gm.getValue('X' + staminaMF, 1));
                return false;
            }

            if (when === 'At Max Stamina') {
                if (!gm.getValue('MaxIdleStamina', 0)) {
                    global.log(1, "Changing to idle general to get Max Stamina");
                    this.PassiveGeneral();
                }

                if (this.stats.stamina.num >= gm.getValue('MaxIdleStamina')) {
                    this.SetDivContent('battle_mess', 'Using max stamina');
                    return true;
                }

                if (this.InLevelUpMode() && this.stats.stamina.num >= attackMinStamina) {
                    this.SetDivContent('battle_mess', 'Burning all stamina to level up');
                    return true;
                }

                this.SetDivContent('battle_mess', 'Waiting for max stamina: ' + this.stats.stamina.num + "/" + gm.getValue('MaxIdleStamina'));
                return false;
            }

            if (this.stats.stamina.num >= attackMinStamina) {
                return true;
            }

            this.SetDivContent('battle_mess', 'Waiting for more stamina: ' + this.stats.stamina.num + "/" + attackMinStamina);
            return false;
        } catch (err) {
            global.error("ERROR in CheckStamina: " + err);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    NeedToHide will return true if the current stamina and health indicate we need to bring
    our health down through battles (hiding).  It also returns true if there is no other outlet
    for our stamina (currently this just means Monsters, but will eventually incorporate
    other stamina uses).
    \-------------------------------------------------------------------------------------*/
    NeedToHide: function () {
        if (gm.getValue('WhenMonster', '') === 'Never') {
            global.log(1, 'Stay Hidden Mode: Monster battle not enabled');
            return true;
        }

        if (!gm.getValue('targetFrombattle_monster', '')) {
            global.log(1, 'Stay Hidden Mode: No monster to battle');
            return true;
        }
    /*-------------------------------------------------------------------------------------\
    The riskConstant helps us determine how much we stay in hiding and how much we are willing
    to risk coming out of hiding.  The lower the riskConstant, the more we spend stamina to
    stay in hiding. The higher the risk constant, the more we attempt to use our stamina for
    non-hiding activities.  The below matrix shows the default riskConstant of 1.7

                S   T   A   M   I   N   A
                1   2   3   4   5   6   7   8   9        -  Indicates we use stamina to hide
        H   10  -   -   +   +   +   +   +   +   +        +  Indicates we use stamina as requested
        E   11  -   -   +   +   +   +   +   +   +
        A   12  -   -   +   +   +   +   +   +   +
        L   13  -   -   +   +   +   +   +   +   +
        T   14  -   -   -   +   +   +   +   +   +
        H   15  -   -   -   +   +   +   +   +   +
            16  -   -   -   -   +   +   +   +   +
            17  -   -   -   -   -   +   +   +   +
            18  -   -   -   -   -   +   +   +   +

    Setting our riskConstant down to 1 will result in us spending out stamina to hide much
    more often:

                S   T   A   M   I   N   A
                1   2   3   4   5   6   7   8   9        -  Indicates we use stamina to hide
        H   10  -   -   +   +   +   +   +   +   +        +  Indicates we use stamina as requested
        E   11  -   -   +   +   +   +   +   +   +
        A   12  -   -   -   +   +   +   +   +   +
        L   13  -   -   -   -   +   +   +   +   +
        T   14  -   -   -   -   -   +   +   +   +
        H   15  -   -   -   -   -   -   +   +   +
            16  -   -   -   -   -   -   -   +   +
            17  -   -   -   -   -   -   -   -   +
            18  -   -   -   -   -   -   -   -   -

    \-------------------------------------------------------------------------------------*/
        var riskConstant = gm.getNumber('HidingRiskConstant', 1.7);
    /*-------------------------------------------------------------------------------------\
    The formula for determining if we should hide goes something like this:

        If  (health - (estimated dmg from next attacks) puts us below 10)  AND
            (current stamina will be at least 5 using staminatime/healthtime ratio)
        Then stamina can be used/saved for normal process
        Else stamina is used for us to hide

    \-------------------------------------------------------------------------------------*/
        if ((this.stats.health.num - ((this.stats.stamina.num - 1) * riskConstant) < 10) && (this.stats.stamina.num * (5 / 3) >= 5)) {
            return false;
        } else {
            return true;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          POTIONS
    /////////////////////////////////////////////////////////////////////

    ConsumePotion: function (potion) {
        try {
            if (!$(".statsTTitle").length) {
                global.log(1, "Going to keep for potions");
                if (this.NavigateTo('keep')) {
                    return true;
                }
            }

            var formId    = "app46755028429_consume_1",
                potionDiv = null,
                button    = null;

            if (potion === 'stamina') {
                formId = "app46755028429_consume_2";
            }

            global.log(1, "Consuming potion potion");
            potionDiv = $("form[id='" + formId + "'] input[src*='potion_consume.gif']");
            if (potionDiv && potionDiv.length) {
                button = potionDiv.get(0);
                if (button) {
                    caap.Click(button);
                } else {
                    global.log(1, "Could not find consume button for", potion);
                    return false;
                }
            } else {
                global.log(1, "Could not find consume form for", potion);
                return false;
            }

            return true;
        } catch (err) {
            global.error("ERROR in ConsumePotion: " + err, potion);
            return false;
        }
    },

    AutoPotions: function () {
        try {
            if (!gm.getValue('AutoPotions', true) || !schedule.Check('AutoPotionTimerDelay')) {
                return false;
            }

            if (this.stats.exp.dif <= gm.getNumber("potionsExperience", 20)) {
                global.log(1, "AutoPotions, ENL condition. Delaying 10 minutes");
                schedule.Set('AutoPotionTimerDelay', 600);
                return false;
            }

            if (this.stats.energy.num < this.stats.energy.max - 10 &&
                this.stats.potions.energy >= gm.getNumber("energyPotionsSpendOver", 39) &&
                this.stats.potions.energy > gm.getNumber("energyPotionsKeepUnder", 35)) {
                return this.ConsumePotion('energy');
            }

            if (this.stats.stamina.num < this.stats.stamina.max - 10 &&
                this.stats.potions.stamina >= gm.getNumber("staminaPotionsSpendOver", 39) &&
                this.stats.potions.stamina > gm.getNumber("staminaPotionsKeepUnder", 35)) {
                return this.ConsumePotion('stamina');
            }

            return false;
        } catch (err) {
            global.error("ERROR in AutoPotion: " + err);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    AutoAlchemy perform aclchemy combines for all recipes that do not have missing
    ingredients.  By default, it also will not combine Battle Hearts.
    First we make sure the option is set and that we haven't been here for a while.
    \-------------------------------------------------------------------------------------*/
    AutoAlchemy: function () {
        try {
            if (!gm.getValue('AutoAlchemy', false)) {
                return false;
            }

            if (!schedule.Check('AlchemyTimer')) {
                return false;
            }
    /*-------------------------------------------------------------------------------------\
    Now we navigate to the Alchemy Recipe page.
    \-------------------------------------------------------------------------------------*/
            if (!this.NavigateTo('keep,alchemy', 'tab_alchemy_on.gif')) {
                var button = null,
                    recipeDiv = null,
                    tempDiv = null;

                recipeDiv = $("#app46755028429_recipe_list");
                if (recipeDiv && recipeDiv.length) {
                    if (recipeDiv.attr("class") !== 'show_items') {
                        tempDiv = recipeDiv.find("div[id*='alchemy_item_tab']");
                        if (tempDiv && tempDiv.length) {
                            button = tempDiv.get(0);
                            if (button) {
                                this.Click(button, 5000);
                                return true;
                            } else {
                                global.log(1, 'Cant find tab button', button);
                                return false;
                            }
                        } else {
                            global.log(1, 'Cant find item tab', tempDiv);
                            return false;
                        }
                    }
                } else {
                    global.log(1, 'Cant find recipe list', recipeDiv);
                    return false;
                }
    /*-------------------------------------------------------------------------------------\
    We close the results of our combines so they don't hog up our screen
    \-------------------------------------------------------------------------------------*/
                button = this.CheckForImage('help_close_x.gif');
                if (button) {
                    this.Click(button, 1000);
                    return true;
                }
    /*-------------------------------------------------------------------------------------\
    Now we get all of the recipes and step through them one by one
    \-------------------------------------------------------------------------------------*/
                var ss = document.evaluate(".//div[@class='alchemyRecipeBack']", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var recipeDiv = ss.snapshotItem(s);
    /*-------------------------------------------------------------------------------------\
    If we are missing an ingredient then skip it
    \-------------------------------------------------------------------------------------*/
                    if (nHtml.FindByAttrContains(recipeDiv, 'div', 'class', 'missing')) {
                        // global.log(1, 'Skipping Recipe');
                        continue;
                    }
    /*-------------------------------------------------------------------------------------\
    If we are skipping battle hearts then skip it
    \-------------------------------------------------------------------------------------*/
                    if (this.CheckForImage('raid_hearts', recipeDiv) && !gm.getValue('AutoAlchemyHearts', false)) {
                        global.log(1, 'Skipping Hearts');
                        continue;
                    }
    /*-------------------------------------------------------------------------------------\
    Find our button and click it
    \-------------------------------------------------------------------------------------*/
                    button = nHtml.FindByAttrXPath(recipeDiv, 'input', "@type='image'");
                    if (button) {
                        this.Click(button, 2000);
                        return true;
                    } else {
                        global.log(1, 'Cant Find Item Image Button');
                    }
                }
    /*-------------------------------------------------------------------------------------\
    All done. Set the timer to check back in 3 hours.
    \-------------------------------------------------------------------------------------*/
                schedule.Set('AlchemyTimer', 10800, 300);
                return false;
            }

            return true;
        } catch (err) {
            global.error("ERROR in Alchemy: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          BANKING
    // Keep it safe!
    /////////////////////////////////////////////////////////////////////

    ImmediateBanking: function () {
        if (!gm.getValue("BankImmed")) {
            return false;
        }

        return this.Bank();
    },

    Bank: function () {
        try {
            var maxInCash = gm.getNumber('MaxInCash', -1);
            var minInCash = gm.getNumber('MinInCash', 0);
            if (!maxInCash || maxInCash < 0 || this.stats.gold.cash <= minInCash || this.stats.gold.cash < maxInCash || this.stats.gold.cash < 10) {
                return false;
            }

            if (general.Select('BankingGeneral')) {
                return true;
            }

            var depositButton = this.CheckForImage('btn_stash.gif');
            if (!depositButton) {
                // Cannot find the link
                return this.NavigateTo('keep');
            }

            var depositForm = depositButton.form;
            var numberInput = nHtml.FindByAttrXPath(depositForm, 'input', "@type='' or @type='text'");
            if (numberInput) {
                numberInput.value = parseInt(numberInput.value, 10) - minInCash;
            } else {
                global.log(1, 'Cannot find box to put in number for bank deposit.');
                return false;
            }

            global.log(1, 'Depositing into bank');
            this.Click(depositButton);
            // added a true result by default until we can find a fix for the result check
            return true;

            /*
            var checkBanked = nHtml.FindByAttrContains(div, "div", "class", 'result');
            if (checkBanked && (checkBanked.firstChild.data.indexOf("You have stashed") < 0)) {
                global.log(1, 'Banking succeeded!');
                return true;
            }

            global.log(1, 'Banking failed! Cannot find result or not stashed!');
            return false;
            */
        } catch (err) {
            global.error("ERROR in Bank: " + err);
            return false;
        }
    },

    RetrieveFromBank: function (num) {
        try {
            if (num <= 0) {
                return false;
            }

            var retrieveButton = this.CheckForImage('btn_retrieve.gif');
            if (!retrieveButton) {
                // Cannot find the link
                return this.NavigateTo('keep');
            }

            var minInStore = gm.getNumber('minInStore', 0);
            if (!(minInStore || minInStore <= this.stats.gold.bank - num)) {
                return false;
            }

            var retrieveForm = retrieveButton.form;
            var numberInput = nHtml.FindByAttrXPath(retrieveForm, 'input', "@type='' or @type='text'");
            if (numberInput) {
                numberInput.value = num;
            } else {
                global.log(1, 'Cannot find box to put in number for bank retrieve.');
                return false;
            }

            global.log(1, 'Retrieving ' + num + ' from bank');
            gm.setValue('storeRetrieve', '');
            this.Click(retrieveButton);
            return true;
        } catch (err) {
            global.error("ERROR in RetrieveFromBank: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          HEAL
    /////////////////////////////////////////////////////////////////////

    Heal: function () {
        try {
            var minToHeal     = 0,
                minStamToHeal = 0;

            this.SetDivContent('heal_mess', '');
            minToHeal = gm.getNumber('MinToHeal', 0);
            if (!minToHeal) {
                return false;
            }

            minStamToHeal = gm.getNumber('MinStamToHeal', 0);
            if (minStamToHeal === "") {
                minStamToHeal = 0;
            }

            if (!this.stats.health) {
                return false;
            }

            if ((gm.getValue('WhenBattle', '') !== 'Never') || (gm.getValue('WhenMonster', '') !== 'Never')) {
                if ((this.InLevelUpMode() || this.stats.stamina.num >= this.stats.stamina.max) && this.stats.health.num < 10) {
                    global.log(1, 'Heal');
                    return this.NavigateTo('keep,heal_button.gif');
                }
            }

            if (this.stats.health.num >= this.stats.health.max || this.stats.health.num >= minToHeal) {
                return false;
            }

            if (this.stats.stamina.num < minStamToHeal) {
                this.SetDivContent('heal_mess', 'Waiting for stamina to heal: ' + this.stats.stamina.num + '/' + minStamToHeal);
                return false;
            }

            global.log(1, 'Heal');
            return this.NavigateTo('keep,heal_button.gif');
        } catch (err) {
            global.error("ERROR in Heal: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          ELITE GUARD
    /////////////////////////////////////////////////////////////////////

    AutoElite: function () {
        try {
            if (!gm.getValue('AutoElite', false)) {
                return false;
            }

            if (!schedule.Check('AutoEliteGetList')) {
                if (!gm.getValue('FillArmy', false)) {
                    gm.deleteValue(this.friendListType.giftc.name + 'Requested');
                }

                return false;
            }

            global.log(1, 'Elite Guard cycle');
            var MergeMyEliteTodo = function (list) {
                global.log(1, 'Elite Guard MergeMyEliteTodo list');
                var eliteArmyList = gm.getList('EliteArmyList');
                if (eliteArmyList.length) {
                    global.log(1, 'Merge and save Elite Guard MyEliteTodo list');
                    var diffList = list.filter(function (todoID) {
                        return (eliteArmyList.indexOf(todoID) < 0);
                    });

                    $.merge(eliteArmyList, diffList);
                    gm.setList('MyEliteTodo', eliteArmyList);
                } else {
                    global.log(1, 'Save Elite Guard MyEliteTodo list');
                    gm.setList('MyEliteTodo', list);
                }
            };

            var eliteList = gm.getList('MyEliteTodo');
            if (!$.isArray(eliteList)) {
                global.log(1, 'MyEliteTodo list is not expected format, deleting');
                eliteList = [];
                gm.deleteValue('MyEliteTodo');
            }

            if (window.location.href.indexOf('party.php')) {
                global.log(1, 'Checking Elite Guard status');
                var autoEliteFew = gm.getValue('AutoEliteFew', false);
                var autoEliteFull = $('.result_body').text().match(/YOUR Elite Guard is FULL/i);
                if (autoEliteFull || (autoEliteFew && gm.getValue('AutoEliteEnd', '') === 'NoArmy')) {
                    if (autoEliteFull) {
                        global.log(1, 'Elite Guard is FULL');
                        if (eliteList.length) {
                            MergeMyEliteTodo(eliteList);
                        }
                    } else if (autoEliteFew && gm.getValue('AutoEliteEnd', '') === 'NoArmy') {
                        global.log(1, 'Not enough friends to fill Elite Guard');
                        gm.deleteValue('AutoEliteFew');
                    }

                    global.log(1, 'Set Elite Guard AutoEliteGetList timer');
                    schedule.Set('AutoEliteGetList', 21600, 300);
                    gm.setValue('AutoEliteEnd', 'Full');
                    global.log(1, 'Elite Guard done');
                    return false;
                }
            }

            if (!eliteList.length) {
                global.log(1, 'Elite Guard no MyEliteTodo cycle');
                var allowPass = false;
                if (gm.getValue(this.friendListType.giftc.name + 'Requested', false) &&
                    gm.getValue(this.friendListType.giftc.name + 'Responded', false) === true) {
                    global.log(1, 'Elite Guard received 0 friend ids');
                    if (gm.getList('EliteArmyList').length) {
                        global.log(1, 'Elite Guard has some defined friend ids');
                        allowPass = true;
                    } else {
                        schedule.Set('AutoEliteGetList', 21600, 300);
                        global.log(1, 'Elite Guard has 0 defined friend ids');
                        gm.setValue('AutoEliteEnd', 'Full');
                        global.log(1, 'Elite Guard done');
                        return false;
                    }
                }

                this.GetFriendList(this.friendListType.giftc);
                var castleageList = [];
                if (gm.getValue(this.friendListType.giftc.name + 'Responded', false) !== true) {
                    castleageList = gm.getList(this.friendListType.giftc.name + 'Responded');
                }

                if (castleageList.length || (this.stats.army.capped <= 1) || allowPass) {
                    global.log(1, 'Elite Guard received a new friend list');
                    MergeMyEliteTodo(castleageList);
                    gm.deleteValue(this.friendListType.giftc.name + 'Responded');
                    gm.deleteValue(this.friendListType.giftc.name + 'Requested');
                    eliteList = gm.getList('MyEliteTodo');
                    if (eliteList.length < 50) {
                        global.log(1, 'WARNING! Elite Guard friend list is fewer than 50: ' + eliteList.length);
                        gm.setValue('AutoEliteFew', true);
                    }
                }
            } else if (schedule.Check('AutoEliteReqNext')) {
                global.log(1, 'Elite Guard has a MyEliteTodo list, shifting User ID');
                var user = eliteList.shift();
                global.log(1, 'Add Elite Guard ID: ' + user);
                this.ClickAjax('party.php?twt=jneg&jneg=true&user=' + user);
                global.log(1, 'Elite Guard sent request, saving shifted MyEliteTodo');
                gm.setList('MyEliteTodo', eliteList);
                schedule.Set('AutoEliteReqNext', 7);
                if (!eliteList.length) {
                    global.log(1, 'Army list exhausted');
                    gm.setValue('AutoEliteEnd', 'NoArmy');
                }
            }

            global.log(1, 'Release Elite Guard cycle');
            return true;
        } catch (err) {
            global.error("ERROR in AutoElite: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          PASSIVE GENERALS
    /////////////////////////////////////////////////////////////////////

    PassiveGeneral: function () {
        if (general.Select('IdleGeneral')) {
            return true;
        }

        gm.setValue('MaxIdleEnergy', this.stats.energy.max);
        gm.setValue('MaxIdleStamina', this.stats.stamina.max);
        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                          AUTOINCOME
    /////////////////////////////////////////////////////////////////////

    AutoIncome: function () {
        if (this.stats.gold.payTime.minutes < 1 && this.stats.gold.payTime.ticker.match(/[0-9]+:[0-9]+/) &&
                gm.getValue('IncomeGeneral') !== 'Use Current') {
            general.Select('IncomeGeneral');
            return true;
        }

        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                              AUTOGIFT
    /////////////////////////////////////////////////////////////////////

    CheckResults_army: function (resultsText) {
        var listHref = $('div[style="padding: 0pt 0pt 10px 0px; overflow: hidden; float: left; width: 240px; height: 50px;"]')
            .find('a[text="Ignore"]');
        for (var i = 0; i < listHref.length; i += 1) {
            var link = "<br /><a title='This link can be used to collect the " +
                "gift when it has been lost on Facebook. !!If you accept a gift " +
                "in this manner then it will leave an orphan request on Facebook!!' " +
                "href='" + listHref[i].href.replace('ignore', 'acpt') + "'>Lost Accept</a>";
            $(link).insertAfter(
                $('div[style="padding: 0pt 0pt 10px 0px; overflow: hidden; float: left; width: 240px; height: 50px;"]')
                .find('a[href=' + listHref[i].href + ']')
            );
        }
    },

    CheckResults_gift_accept: function (resultsText) {
        // Confirm gifts actually sent
        if ($('#app46755028429_app_body').text().match(/You have sent \d+ gifts?/)) {
            global.log(1, 'Confirmed gifts sent out.');
            gm.setValue('RandomGiftPic', '');
            gm.setValue('FBSendList', '');
        }
    },


    SortObject: function (obj, sortfunc, deep) {
        var list   = [],
            output = {},
            i      = 0;

        if (typeof deep === 'undefined') {
            deep = false;
        }

        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                list.push(i);
            }
        }

        list.sort(sortfunc);
        for (i = 0; i < list.length; i += 1) {
            if (deep && typeof obj[list[i]] === 'object') {
                output[list[i]] = this.SortObject(obj[list[i]], sortfunc, deep);
            } else {
                output[list[i]] = obj[list[i]];
            }
        }

        return output;
    },

    News: function () {
        try {
            if ($('#app46755028429_battleUpdateBox').length) {
                var xp = 0,
                    bp = 0,
                    wp = 0,
                    win = 0,
                    lose = 0,
                    deaths = 0,
                    cash = 0,
                    i,
                    list = [],
                    user = {};

                $('#app46755028429_battleUpdateBox .alertsContainer .alert_content').each(function (i, el) {
                    var uid, txt = $(el).text().replace(/,/g, ''),
                        title = $(el).prev().text(),
                        days = title.regex(/([0-9]+) days/i),
                        hours = title.regex(/([0-9]+) hours/i),
                        minutes = title.regex(/([0-9]+) minutes/i),
                        seconds = title.regex(/([0-9]+) seconds/i),
                        time,
                        my_xp = 0,
                        my_bp = 0,
                        my_wp = 0,
                        my_cash = 0;

                    time = Date.now() - ((((((((days || 0) * 24) + (hours || 0)) * 60) + (minutes || 59)) * 60) + (seconds || 59)) * 1000);
                    if (txt.regex(/You were killed/i)) {
                        deaths += 1;
                    } else {
                        uid = $('a:eq(0)', el).attr('href').regex(/user=([0-9]+)/i);
                        user[uid] = user[uid] ||
                            {
                                name: $('a:eq(0)', el).text(),
                                win: 0,
                                lose: 0
                            };

                        var result = null;
                        if (txt.regex(/Victory!/i)) {
                            win += 1;
                            user[uid].lose += 1;
                            my_xp = txt.regex(/([0-9]+) experience/i);
                            my_bp = txt.regex(/([0-9]+) Battle Points!/i);
                            my_wp = txt.regex(/([0-9]+) War Points!/i);
                            my_cash = txt.regex(/\$([0-9]+)/i);
                            result = 'win';
                        } else {
                            lose += 1;
                            user[uid].win += 1;
                            my_xp = 0 - txt.regex(/([0-9]+) experience/i);
                            my_bp = 0 - txt.regex(/([0-9]+) Battle Points!/i);
                            my_wp = 0 - txt.regex(/([0-9]+) War Points!/i);
                            my_cash = 0 - txt.regex(/\$([0-9]+)/i);
                            result = 'loss';
                        }

                        xp += my_xp;
                        bp += my_bp;
                        wp += my_wp;
                        cash += my_cash;

                    }
                });

                if (win || lose) {
                    list.push('You were challenged <strong>' + (win + lose) + '</strong> times, winning <strong>' + win + '</strong> and losing <strong>' + lose + '</strong>.');
                    list.push('You ' + (xp >= 0 ? 'gained <span class="positive">' : 'lost <span class="negative">') + this.makeCommaValue(Math.abs(xp)) + '</span> experience points.');
                    list.push('You ' + (cash >= 0 ? 'gained <span class="positive">' : 'lost <span class="negative">') + '<b class="gold">$' + this.makeCommaValue(Math.abs(cash)) + '</b></span>.');
                    list.push('You ' + (bp >= 0 ? 'gained <span class="positive">' : 'lost <span class="negative">') + this.makeCommaValue(Math.abs(bp)) + '</span> Battle Points.');
                    list.push('You ' + (wp >= 0 ? 'gained <span class="positive">' : 'lost <span class="negative">') + this.makeCommaValue(Math.abs(wp)) + '</span> War Points.');
                    list.push('');
                    user = this.SortObject(user, function (a, b) {
                            return (user[b].win + (user[b].lose / 100)) - (user[a].win + (user[a].lose / 100));
                        });

                    for (i in user) {
                        if (user.hasOwnProperty(i)) {
                            list.push('<strong title="' + i + '">' + user[i].name + '</strong> ' +
                                (user[i].win ? 'beat you <span class="negative">' + user[i].win +
                                '</span> time' + (user[i].win > 1 ? 's' : '') : '') +
                                (user[i].lose ? (user[i].win ? ' and ' : '') +
                                'was beaten <span class="positive">' + user[i].lose +
                                '</span> time' + (user[i].lose > 1 ? 's' : '') : '') + '.');
                        }
                    }

                    if (deaths) {
                        list.push('You died ' + (deaths > 1 ? deaths + ' times' : 'once') + '!');
                    }

                    $('#app46755028429_battleUpdateBox .alertsContainer').prepend('<div style="padding: 0pt 0pt 10px;"><div class="alert_title">Summary:</div><div class="alert_content">' + list.join('<br>') + '</div></div>');
                }
            }

            return true;
        } catch (err) {
            global.error("ERROR in News: " + err);
            return false;
        }
    },

    CheckResults_index: function (resultsText) {
        if (gm.getValue('NewsSummary', true)) {
            this.News();
        }

        // Check for new gifts
        // A warrior wants to join your Army!
        // Send Gifts to Friends
        if (gm.getValue('AutoGift', false) && !gm.getValue('HaveGift', false)) {
            if (resultsText && /Send Gifts to Friends/.test(resultsText)) {
                global.log(1, 'We have a gift waiting!');
                gm.setValue('HaveGift', true);
            }
        }

        schedule.Set("ajaxGiftCheck", gm.getValue('CheckGiftMins', 15) * 60, 300);
    },

    AutoGift: function () {
        try {
            if (!gm.getValue('AutoGift', false)) {
                return false;
            }

            var giftNamePic = {};
            var giftEntry = nHtml.FindByAttrContains(document.body, 'div', 'id', '_gift1');
            if (giftEntry) {
                gm.setList('GiftList', []);
                var ss = document.evaluate(".//div[contains(@id,'_gift')]", giftEntry.parentNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var giftDiv = ss.snapshotItem(s);
                    var giftName = $.trim(nHtml.GetText(giftDiv)).replace(/!/i, '');
                    if (gm.getValue("GiftList").indexOf(giftName) >= 0) {
                        giftName += ' #2';
                    }

                    gm.listPush('GiftList', giftName);
                    giftNamePic[giftName] = this.CheckForImage('mystery', giftDiv).src.match(/[\w_\.]+$/i).toString();
                    //global.log(1, 'Gift name: ' + giftName + ' pic ' + giftNamePic[giftName] + ' hidden ' + giftExtraGiftTF[giftName]);
                }

                //global.log(1, 'Gift list: ' + gm.getList('GiftList'));
                if (gm.getValue('GiftChoice') === 'Get Gift List') {
                    gm.setValue('GiftChoice', 'Same Gift As Received');
                    this.SelectDropOption('GiftChoice', 'Same Gift As Received');
                }
            }

            // Go to gifts page if asked to read in gift list
            if (gm.getValue('GiftChoice', false) === 'Get Gift List' || !gm.getList('GiftList').length) {
                if (this.NavigateTo('gift', 'tab_gifts_on.gif')) {
                    return true;
                }
            }

            var giverId = [];
            // Gather the gifts
            if (gm.getValue('HaveGift', false)) {
                if (this.NavigateTo('gift,army', 'invite_on.gif')) {
                    return true;
                }

                var acceptDiv = nHtml.FindByAttrContains(document.body, 'a', 'href', 'reqs.php#confirm_');
                var ignoreDiv = nHtml.FindByAttrContains(document.body, 'a', 'href', 'act=ignore');
                if (ignoreDiv && acceptDiv) {
                    giverId = new RegExp("(userId=|user=|/profile/|uid=)([0-9]+)").exec(ignoreDiv.href);
                    if (!giverId) {
                        global.log(1, 'Unable to find giver ID');
                        return false;
                    }

                    var profDiv = nHtml.FindByAttrContains(acceptDiv.parentNode.parentNode, 'a', 'href', 'profile.php');
                    if (!profDiv) {
                        profDiv = nHtml.FindByAttrContains(acceptDiv.parentNode.parentNode, 'div', 'style', 'overflow: hidden; text-align: center; width: 170px;');
                    }

                    var giverName = "Unknown";
                    if (profDiv) {
                        giverName = $.trim(nHtml.GetText(profDiv));
                    }

                    gm.setValue('GiftEntry', giverId[2] + global.vs + giverName);
                    global.log(1, 'Giver ID = ' + giverId[2] + ' Name  = ' + giverName);
                    schedule.Set('ClickedFacebookURL', 10);
                    if (global.is_chrome) {
                        acceptDiv.href = "http://apps.facebook.com/reqs.php#confirm_46755028429_0";
                    }

                    gm.setValue('clickUrl', acceptDiv.href);
                    this.VisitUrl(acceptDiv.href);
                    return true;
                }

                gm.deleteValue('HaveGift');
                return this.NavigateTo('gift', 'tab_gifts_on.gif');
            }

            var button = nHtml.FindByAttrContains(document.body, 'input', 'name', 'skip_ci_btn');
            if (button) {
                global.log(1, 'Denying Email Nag For Gift Send');
                caap.Click(button);
                return true;
            }

            // Facebook pop-up on CA
            if (gm.getValue('FBSendList', '')) {
                button = nHtml.FindByAttrContains(document.body, 'input', 'name', 'sendit');
                if (button) {
                    global.log(1, 'Sending gifts to Facebook');
                    caap.Click(button);
                    return true;
                }

                gm.listAddBefore('ReceivedList', gm.getList('FBSendList'));
                gm.setList('FBSendList', []);
                button = nHtml.FindByAttrContains(document.body, 'input', 'name', 'ok');
                if (button) {
                    global.log(1, 'Over max gifts per day');
                    schedule.Set('WaitForNextGiftSend', 10800, 300);
                    caap.Click(button);
                    return true;
                }

                global.log(1, 'No Facebook pop up to send gifts');
                return false;
            }

            // CA send gift button
            if (gm.getValue('CASendList', '')) {
                var sendForm = nHtml.FindByAttrContains(document.body, 'form', 'id', 'req_form_');
                if (sendForm) {
                    button = nHtml.FindByAttrContains(sendForm, 'input', 'name', 'send');
                    if (button) {
                        global.log(1, 'Clicked CA send gift button');
                        gm.listAddBefore('FBSendList', gm.getList('CASendList'));
                        gm.setList('CASendList', []);
                        caap.Click(button);
                        return true;
                    }
                }

                global.log(1, 'No CA button to send gifts');
                gm.listAddBefore('ReceivedList', gm.getList('CASendList'));
                gm.setList('CASendList', []);
                return false;
            }



            if (!schedule.Check('WaitForNextGiftSend')) {
                return false;
            }

            if (schedule.Check('WaitForNotFoundIDs') && gm.getList('NotFoundIDs')) {
                gm.listAddBefore('ReceivedList', gm.getList('NotFoundIDs'));
                gm.setList('NotFoundIDs', []);
            }

            if (gm.getValue('DisableGiftReturn', false)) {
                gm.setList('ReceivedList', []);
            }

            var giverList = gm.getList('ReceivedList');
            if (!giverList.length) {
                return false;
            }

            if (this.NavigateTo('gift', 'tab_gifts_on.gif')) {
                return true;
            }

            // Get the gift to send out
            if (giftNamePic && giftNamePic.length === 0) {
                global.log(1, 'No list of pictures for gift choices');
                return false;
            }

            var givenGiftType = '';
            var giftPic = '';
            var giftChoice = gm.getValue('GiftChoice');
            var giftList = gm.getList('GiftList');
            switch (giftChoice) {
            case 'Random Gift':
                giftPic = gm.getValue('RandomGiftPic');
                if (giftPic) {
                    break;
                }

                var picNum = Math.floor(Math.random() * (giftList.length));
                var n = 0;
                for (var picN in giftNamePic) {
                    if (giftNamePic.hasOwnProperty(picN)) {
                        n += 1;
                        if (n === picNum) {
                            giftPic = giftNamePic[picN];
                            gm.setValue('RandomGiftPic', giftPic);
                            break;
                        }
                    }
                }
                if (!giftPic) {
                    global.log(1, 'No gift type match. GiverList: ' + giverList);
                    return false;
                }
                break;
            case 'Same Gift As Received':
                givenGiftType = giverList[0].split(global.vs)[2];
                global.log(1, 'Looking for same gift as ' + givenGiftType);
                if (giftList.indexOf(givenGiftType) < 0) {
                    global.log(1, 'No gift type match. Using first gift as default.');
                    givenGiftType = gm.getList('GiftList')[0];
                }
                giftPic = giftNamePic[givenGiftType];
                break;
            default:
                giftPic = giftNamePic[gm.getValue('GiftChoice')];
                break;
            }

            // Move to gifts page
            var picDiv = this.CheckForImage(giftPic);
            if (!picDiv) {
                global.log(1, 'Unable to find ', giftPic);
                return false;
            } else {
                global.log(1, 'GiftPic is ', giftPic);
            }

            if (nHtml.FindByAttrContains(picDiv.parentNode.parentNode.parentNode.parentNode, 'div', 'style', 'giftpage_select')) {
                if (this.NavigateTo('gift_invite_castle_off.gif', 'gift_invite_castle_on.gif')) {
                    return true;
                }
            } else {
                this.NavigateTo('gift_more_gifts.gif');
                return this.NavigateTo(giftPic);
            }

            // Click on names
            var giveDiv = nHtml.FindByAttrContains(document.body, 'div', 'class', 'unselected_list');
            var doneDiv = nHtml.FindByAttrContains(document.body, 'div', 'class', 'selected_list');
            gm.setList('ReceivedList', []);
            for (var p in giverList) {
                if (giverList.hasOwnProperty(p)) {
                    if (p > 9) {
                        gm.listPush('ReceivedList', giverList[p]);
                        continue;
                    }

                    var giverData = giverList[p].split(global.vs);
                    var giverID = giverData[0];
                    var giftType = giverData[2];
                    if (giftChoice === 'Same Gift As Received' && giftType !== givenGiftType && giftList.indexOf(giftType) >= 0) {
                        //global.log(1, 'giftType ' + giftType + ' givenGiftType ' + givenGiftType);
                        gm.listPush('ReceivedList', giverList[p]);
                        continue;
                    }

                    var nameButton = nHtml.FindByAttrContains(giveDiv, 'input', 'value', giverID);
                    if (!nameButton) {
                        global.log(1, 'Unable to find giver ID ' + giverID);
                        gm.listPush('NotFoundIDs', giverList[p]);
                        schedule.Set('WaitForNotFoundIDs', 10800);
                        continue;
                    } else {
                        global.log(1, 'Clicking giver ID ' + giverID);
                        this.Click(nameButton);
                    }

                    //test actually clicked
                    if (nHtml.FindByAttrContains(doneDiv, 'input', 'value', giverID)) {
                        gm.listPush('CASendList', giverList[p]);
                        global.log(1, 'Moved ID ' + giverID);
                    } else {
                        global.log(1, 'NOT moved ID ' + giverID);
                        gm.listPush('NotFoundIDs', giverList[p]);
                        schedule.Set('WaitForNotFoundIDs', 10800);
                    }
                }
            }

            return true;
        } catch (err) {
            global.error("ERROR in AutoGift: " + err);
            return false;
        }
    },

    AcceptGiftOnFB: function () {
        try {
            if (global.is_chrome) {
                if (window.location.href.indexOf('apps.facebook.com/reqs.php') < 0 && window.location.href.indexOf('apps.facebook.com/home.php') < 0) {
                    return false;
                }
            } else {
                if (window.location.href.indexOf('www.facebook.com/reqs.php') < 0 && window.location.href.indexOf('www.facebook.com/home.php') < 0) {
                    return false;
                }
            }

            var giftEntry = gm.getValue('GiftEntry', '');
            if (!giftEntry) {
                return false;
            }

            global.log(1, 'On FB page with gift ready to go');
            if (window.location.href.indexOf('facebook.com/reqs.php') >= 0) {
                var ss = document.evaluate(".//input[contains(@name,'/castle/tracker.php')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var giftDiv = ss.snapshotItem(s);
                    var user = giftDiv.name.match(/uid%3D(\d+)/i);
                    if (!user || user.length !== 2) {
                        continue;
                    }

                    user = parseInt(user[1], 10);
                    if (user !== this.NumberOnly(giftEntry)) {
                        continue;
                    }

                    var giftType = $.trim(giftDiv.value.replace(/^Accept /i, ''));
                    if (gm.getList('GiftList').indexOf(giftType) < 0) {
                        global.log(1, 'Unknown gift type', giftType);
                        giftType = 'Unknown Gift';
                    }

                    if (gm.getValue('ReceivedList', ' ').indexOf(giftEntry) < 0) {
                        gm.listPush('ReceivedList', giftEntry + global.vs + giftType);
                    }

                    global.log(1, 'This giver/gift/givers', user, giftType, gm.getList('ReceivedList'));
                    gm.setValue('GiftEntry', '');
                    this.Click(giftDiv);
                    return true;
                }
            }

            if (!schedule.Check('ClickedFacebookURL')) {
                return false;
            }

            global.log(1, 'Error: unable to find gift', giftEntry);
            if (gm.getValue('ReceivedList', ' ').indexOf(giftEntry) < 0) {
                gm.listPush('ReceivedList', giftEntry + '\tUnknown Gift');
            }

            gm.setValue('GiftEntry', '');
            this.VisitUrl("http://apps.facebook.com/castle_age/army.php?act=acpt&uid=" + this.NumberOnly(giftEntry));
            return true;
        } catch (err) {
            global.error("ERROR in AcceptGiftOnFB: " + err);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                              IMMEDIATEAUTOSTAT
    /////////////////////////////////////////////////////////////////////

    ImmediateAutoStat: function () {
        if (!gm.getValue("StatImmed") || !gm.getValue('AutoStat')) {
            return false;
        }

        return caap.AutoStat();
    },

    ////////////////////////////////////////////////////////////////////
    //                      Auto Stat
    ////////////////////////////////////////////////////////////////////

    IncreaseStat: function (attribute, attrAdjust, atributeSlice) {
        try {
            global.log(9, "Attribute: " + attribute + "   Adjust: " + attrAdjust);
            attribute = attribute.toLowerCase();
            var button        = null,
                ajaxLoadIcon  = null,
                level         = 0,
                attrCurrent   = 0,
                energy        = 0,
                stamina       = 0,
                attack        = 0,
                defense       = 0,
                health        = 0,
                attrAdjustNew = 0,
                logTxt        = "";

            ajaxLoadIcon = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app46755028429_AjaxLoadIcon');
            if (!ajaxLoadIcon || ajaxLoadIcon.style.display !== 'none') {
                global.log(1, "Unable to find AjaxLoadIcon: Fail");
                return "Fail";
            }

            if ((attribute === 'stamina') && (this.stats.points.skill < 2)) {
                //gm.setValue("SkillPointsNeed", 2);
                global.log(1, "Stamina requires 2 upgrade points: Next");
                return "Next";
            }

            switch (attribute) {
            case "energy" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'energy_max');
                break;
            case "stamina" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'stamina_max');
                break;
            case "attack" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'attack');
                break;
            case "defense" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'defense');
                break;
            case "health" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'health_max');
                break;
            default :
                throw "Unable to match attribute: " + attribute;
            }

            if (!button) {
                global.log(1, "Unable to locate upgrade button: " + attribute);
                return "Fail";
            }

            //gm.setValue("SkillPointsNeed", 1);
            attrAdjustNew = attrAdjust;
            logTxt += attrAdjust;
            level = this.stats.level;
            attrCurrent = parseInt(button.parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            energy = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'energy_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            stamina = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'stamina_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            if (level >= 10) {
                attack = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'attack').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
                defense = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'defense').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
                health = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'health_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            }

            global.log(9, "Energy=" + energy + " Stamina=" + stamina + " Attack=" + attack + " Defense=" + defense + " Heath=" + health);
            if (gm.getValue('AutoStatAdv', false)) {
                //Using eval, so user can define formulas on menu, like energy = level + 50
                attrAdjustNew = eval(attrAdjust);
                logTxt = "(" + attrAdjust + ")=" + attrAdjustNew;
            }

            if (attrAdjustNew > attrCurrent) {
                global.log(1, "Status Before [" + attribute + "=" + attrCurrent + "]  Adjusting To [" + logTxt + "]");
                this.Click(button);
                return "Click";
            }

            return "Next";
        } catch (err) {
            global.error("ERROR in IncreaseStat: " + err);
            return "Error";
        }
    },

    statsMatch: true,

    autoStatRuleLog: true,

    AutoStat: function () {
        try {
            if (!gm.getValue('AutoStat') || !this.stats.points.skill) {
                return false;
            }

            if (!this.statsMatch) {
                if (this.autoStatRuleLog) {
                    global.log(1, "User should change their stats rules");
                    this.autoStatRuleLog = false;
                }

                return false;
            }

            /*
            if (!this.stats.points.skill || this.stats.points.skill < gm.getValue("SkillPointsNeed", 1)) {
                if (this.autoStatRuleLog) {
                    global.log(1, "Dont have enough stats points: Have (" + this.stats.points.skill + ") Require (" + gm.getValue("SkillPointsNeed", 1) + ")");
                    this.autoStatRuleLog = false;
                }

                return false;
            }
            */

            var atributeSlice      = null,
                startAtt           = 0,
                stopAtt            = 4,
                attrName           = '',
                attribute          = '',
                attrValue          = 0,
                n                  = 0,
                returnIncreaseStat = '';

            atributeSlice = nHtml.FindByAttrContains(document.body, "div", "class", 'keep_attribute_section');
            if (!atributeSlice) {
                this.NavigateTo('keep');
                return true;
            }

            if (gm.getValue("AutoStatAdv", false)) {
                startAtt = 5;
                stopAtt = 9;
            }

            for (n = startAtt; n <= stopAtt; n += 1) {
                attrName = 'Attribute' + n;
                attribute = gm.getValue(attrName, '');
                if (attribute === '') {
                    global.log(9, attrName + " is blank: continue");
                    continue;
                }

                if (this.stats.level < 10) {
                    if (attribute === 'Attack' || attribute === 'Defense' || attribute === 'Health') {
                        global.log(1, "Characters below level 10 can not increase Attack, Defense or Health: continue");
                        continue;
                    }
                }

                attrValue = gm.getValue('AttrValue' + n, 0);
                returnIncreaseStat = this.IncreaseStat(attribute, attrValue, atributeSlice);
                switch (returnIncreaseStat) {
                case "Fail" :
                case "Next" :
                    global.log(9, attrName + " : next");
                    continue;
                case "Click" :
                    global.log(9, attrName + " : click");
                    return true;
                default :
                    global.log(9, attrName + " return value: " + returnIncreaseStat);
                    return false;
                }
            }

            global.log(1, "No rules match to increase stats");
            this.statsMatch = false;
            return false;
        } catch (err) {
            global.error("ERROR in AutoStat: " + err);
            return false;
        }
    },

    AutoCollectMA: function () {
        try {
            if (!gm.getValue('AutoCollectMA', true) || !schedule.Check('AutoCollectMATimer')) {
                return false;
            }

            global.log(1, "Collecting Master and Apprentice reward");
            caap.SetDivContent('idle_mess', 'Collect MA Reward');
            var buttonMas = nHtml.FindByAttrContains(document.body, "img", "src", "ma_view_progress_main"),
                buttonApp = nHtml.FindByAttrContains(document.body, "img", "src", "ma_main_learn_more");

            if (!buttonMas && !buttonApp) {
                global.log(1, "Going to home");
                if (this.NavigateTo('index')) {
                    return true;
                }
            }

            if (buttonMas) {
                this.Click(buttonMas);
                caap.SetDivContent('idle_mess', 'Collected MA Reward');
                global.log(1, "Collected Master and Apprentice reward");
            }

            if (!buttonMas && buttonApp) {
                caap.SetDivContent('idle_mess', 'No MA Rewards');
                global.log(1, "No Master and Apprentice rewards");
            }

            window.setTimeout(function () {
                caap.SetDivContent('idle_mess', '');
            }, 5000);

            schedule.Set('AutoCollectMATimer', 86400, 300);
            global.log(1, "Collect Master and Apprentice reward completed");
            return true;
        } catch (err) {
            global.error("ERROR in AutoCollectMA: " + err);
            return false;
        }
    },

    friendListType: {
        facebook: {
            name: "facebook",
            url: 'http://apps.facebook.com/castle_age/army.php?app_friends=false&giftSelection=1'
        },
        gifta: {
            name: "gifta",
            url: 'http://apps.facebook.com/castle_age/gift.php?app_friends=a&giftSelection=1'
        },
        giftb: {
            name: "giftb",
            url: 'http://apps.facebook.com/castle_age/gift.php?app_friends=b&giftSelection=1'
        },
        giftc: {
            name: "giftc",
            url: 'http://apps.facebook.com/castle_age/gift.php?app_friends=c&giftSelection=1'
        }
    },

    GetFriendList: function (listType, force) {
        try {
            global.log(1, "Entered GetFriendList and request is for: " + listType.name);
            if (force) {
                gm.deleteValue(listType.name + 'Requested');
                gm.deleteValue(listType.name + 'Responded');
            }

            if (!gm.getValue(listType.name + 'Requested', false)) {
                global.log(1, "Getting Friend List: " + listType.name);
                gm.setValue(listType.name + 'Requested', true);

                $.ajax({
                    url: listType.url,
                    error:
                        function (XMLHttpRequest, textStatus, errorThrown) {
                            gm.deleteValue(listType.name + 'Requested');
                            global.log(1, "GetFriendList(" + listType.name + "): " + textStatus);
                        },
                    success:
                        function (data, textStatus, XMLHttpRequest) {
                            try {
                                global.log(1, "GetFriendList.ajax splitting data");
                                data = data.split('<div class="unselected_list">');
                                if (data.length < 2) {
                                    throw "Could not locate 'unselected_list'";
                                }

                                data = data[1].split('</div><div class="selected_list">');
                                if (data.length < 2) {
                                    throw "Could not locate 'selected_list'";
                                }

                                global.log(1, "GetFriendList.ajax data split ok");
                                var friendList = [];
                                $('<div></div>').html(data[0]).find('input').each(function (index) {
                                    friendList.push($(this).val());
                                });

                                global.log(1, "GetFriendList.ajax saving friend list of " + friendList.length + " ids");
                                if (friendList.length) {
                                    gm.setList(listType.name + 'Responded', friendList);
                                } else {
                                    gm.setValue(listType.name + 'Responded', true);
                                }

                                global.log(1, "GetFriendList(" + listType.name + "): " + textStatus);
                                //global.log(1, "GetFriendList(" + listType.name + "): " + friendList);
                            } catch (err) {
                                gm.deleteValue(listType.name + 'Requested');
                                global.error("ERROR in GetFriendList.ajax: " + err);
                            }
                        }
                });
            } else {
                global.log(1, "Already requested GetFriendList for: " + listType.name);
            }

            return true;
        } catch (err) {
            global.error("ERROR in GetFriendList(" + listType.name + "): " + err);
            return false;
        }
    },

    addFriendSpamCheck: 0,

    AddFriend: function (id) {
        try {
            var responseCallback = function (XMLHttpRequest, textStatus, errorThrown) {
                if (caap.addFriendSpamCheck > 0) {
                    caap.addFriendSpamCheck -= 1;
                }

                global.log(1, "AddFriend(" + id + "): " + textStatus);
            };

            $.ajax({
                url: 'http://apps.facebook.com/castle_age/party.php?twt=jneg&jneg=true&user=' + id + '&lka=' + id + '&etw=9&ref=nf',
                error: responseCallback,
                success: responseCallback
            });

            return true;
        } catch (err) {
            global.error("ERROR in AddFriend(" + id + "): " + err);
            return false;
        }
    },

    AutoFillArmy: function (caListType, fbListType) {
        try {
            if (!gm.getValue('FillArmy', false)) {
                return false;
            }

            var armyCount = gm.getValue("ArmyCount", 0);
            if (armyCount === 0) {
                this.SetDivContent('idle_mess', 'Filling Army');
                global.log(1, "Filling army");
            }

            if (gm.getValue(caListType.name + 'Responded', false) === true ||
                    gm.getValue(fbListType.name + 'Responded', false) === true) {
                this.SetDivContent('idle_mess', '<b>Fill Army Completed</b>');
                global.log(1, "Fill Army Completed: no friends found");
                window.setTimeout(function () {
                    caap.SetDivContent('idle_mess', '');
                }, 5000);

                gm.setValue('FillArmy', false);
                gm.deleteValue("ArmyCount");
                gm.deleteValue('FillArmyList');
                gm.deleteValue(caListType.name + 'Responded');
                gm.deleteValue(fbListType.name + 'Responded');
                gm.deleteValue(caListType.name + 'Requested');
                gm.deleteValue(fbListType.name + 'Requested');
                return true;
            }

            var fillArmyList = gm.getList('FillArmyList');
            if (!fillArmyList.length) {
                this.GetFriendList(caListType);
                this.GetFriendList(fbListType);
            }

            var castleageList = gm.getList(caListType.name + 'Responded');
            //global.log(1, "gifList: " + castleageList);
            var facebookList = gm.getList(fbListType.name + 'Responded');
            //global.log(1, "facebookList: " + facebookList);
            if ((castleageList.length && facebookList.length) || fillArmyList.length) {
                if (!fillArmyList.length) {
                    var diffList = facebookList.filter(function (facebookID) {
                        return (castleageList.indexOf(facebookID) >= 0);
                    });

                    //global.log(1, "diffList: " + diffList);
                    gm.setList('FillArmyList', diffList);
                    fillArmyList = gm.getList('FillArmyList');
                    gm.deleteValue(caListType.name + 'Responded');
                    gm.deleteValue(fbListType.name + 'Responded');
                    gm.deleteValue(caListType.name + 'Requested');
                    gm.deleteValue(fbListType.name + 'Requested');
                }

                // Add army members //
                var batchCount = 5;
                if (fillArmyList.length < 5) {
                    batchCount = fillArmyList.length;
                } else if (fillArmyList.length - armyCount < 5) {
                    batchCount = fillArmyList.length - armyCount;
                }

                batchCount = batchCount - this.addFriendSpamCheck;
                for (var i = 0; i < batchCount; i += 1) {
                    this.AddFriend(fillArmyList[armyCount]);
                    armyCount += 1;
                    this.addFriendSpamCheck += 1;
                }

                this.SetDivContent('idle_mess', 'Filling Army, Please wait...' + armyCount + "/" + fillArmyList.length);
                global.log(1, 'Filling Army, Please wait...' + armyCount + "/" + fillArmyList.length);
                gm.setValue("ArmyCount", armyCount);
                if (armyCount >= fillArmyList.length) {
                    this.SetDivContent('idle_mess', '<b>Fill Army Completed</b>');
                    window.setTimeout(function () {
                        caap.SetDivContent('idle_mess', '');
                    }, 5000);

                    global.log(1, "Fill Army Completed");
                    gm.setValue('FillArmy', false);
                    gm.deleteValue("ArmyCount");
                    gm.deleteValue('FillArmyList');
                }
            }

            return true;
        } catch (err) {
            global.error("ERROR in AutoFillArmy: " + err);
            this.SetDivContent('idle_mess', '<b>Fill Army Failed</b>');
            window.setTimeout(function () {
                caap.SetDivContent('idle_mess', '');
            }, 5000);

            gm.setValue('FillArmy', false);
            gm.deleteValue("ArmyCount");
            gm.deleteValue('FillArmyList');
            gm.deleteValue(caListType.name + 'Responded');
            gm.deleteValue(fbListType.name + 'Responded');
            gm.deleteValue(caListType.name + 'Requested');
            gm.deleteValue(fbListType.name + 'Requested');
            return false;
        }
    },

    AjaxGiftCheck: function () {
        try {
            if (!gm.getValue('AutoGift', false) || !schedule.Check("ajaxGiftCheck")) {
                return false;
            }

            global.log(2, "Performing AjaxGiftCheck");

            $.ajax({
                url: "http://apps.facebook.com/castle_age/index.php",
                error:
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        global.error("AjaxGiftCheck.ajax", textStatus);
                    },
                success:
                    function (data, textStatus, XMLHttpRequest) {
                        try {
                            global.log(2, "AjaxGiftCheck.ajax: Checking data.");
                            var resultsDiv = $(data).find("span[class*='result_body']");

                            if (resultsDiv && resultsDiv.length && /Send Gifts to Friends/.test($.trim(resultsDiv.text()))) {
                                global.log(1, 'AjaxGiftCheck.ajax: We have a gift waiting!');
                                gm.setValue('HaveGift', true);
                            } else {
                                global.log(1, 'AjaxGiftCheck.ajax: No gifts waiting.');
                                gm.deleteValue('HaveGift');
                            }

                            global.log(2, "AjaxGiftCheck.ajax: Done.");
                        } catch (err) {
                            global.error("ERROR in AjaxGiftCheck.ajax: " + err);
                        }
                    }
            });

            schedule.Set("ajaxGiftCheck", gm.getValue('CheckGiftMins', 15) * 60, 300);
            global.log(2, "Completed AjaxGiftCheck");
            return true;
        } catch (err) {
            global.error("ERROR in AjaxGiftCheck: " + err);
            return false;
        }
    },

    Idle: function () {
        if (gm.getValue('resetselectMonster', false)) {
            global.log(1, "resetselectMonster");
            this.selectMonster(true);
            gm.setValue('resetselectMonster', false);
        }

        if (this.CheckGenerals()) {
            return true;
        }

        if (this.CheckKeep()) {
            return true;
        }

        if (this.AutoCollectMA()) {
            return true;
        }

        if (this.AjaxGiftCheck()) {
            return true;
        }

        if (this.ReconPlayers()) {
            return true;
        }

        if (general.GetAllStats()) {
            return true;
        }

        if (this.CheckOracle()) {
            return true;
        }

        if (this.CheckBattleRank()) {
            return true;
        }

        if (this.CheckWarRank()) {
            return true;
        }

        if (this.CheckAchievements()) {
            return true;
        }

        if (this.CheckSymbolQuests()) {
            return true;
        }

        if (this.CheckSoldiers()) {
            return true;
        }

        if (this.CheckItem()) {
            return true;
        }

        if (this.CheckMagic()) {
            return true;
        }

        if (this.CheckCharacterClasses()) {
            return true;
        }

        this.AutoFillArmy(this.friendListType.giftc, this.friendListType.facebook);
        this.UpdateDashboard();
        gm.setValue('ReleaseControl', true);
        return true;
    },

    /*-------------------------------------------------------------------------------------\
                                      RECON PLAYERS
    ReconPlayers is an idle background process that scans the battle page for viable
    targets that can later be attacked.
    \-------------------------------------------------------------------------------------*/

    ReconRecordArray : [],


    ReconRecord: function () {
        this.data = {
            userID          : 0,
            nameStr         : '',
            rankStr         : '',
            rankNum         : 0,
            warRankStr      : '',
            warRankNum      : 0,
            levelNum        : 0,
            armyNum         : 0,
            deityNum        : 0,
            invadewinsNum   : 0,
            invadelossesNum : 0,
            duelwinsNum     : 0,
            duellossesNum   : 0,
            defendwinsNum   : 0,
            defendlossesNum : 0,
            statswinsNum    : 0,
            statslossesNum  : 0,
            goldNum         : 0,
            aliveTime       : new Date(2009, 0, 1).getTime(),
            attackTime      : new Date(2009, 0, 1).getTime(),
            selectTime      : new Date(2009, 0, 1).getTime()
        };
    },

    LoadRecon: function () {
        this.ReconRecordArray = gm.getJValue('reconJSON', []);
    },

    SaveRecon: function () {
        gm.setJValue('reconJSON', this.ReconRecordArray);
    },

    ReconPlayers: function () {
        try {
            if (!gm.getValue('DoPlayerRecon', false)) {
                return false;
            }

            if (this.stats.stamina.num <= 0) {
                return false;
            }

            if (!schedule.Check('PlayerReconTimer')) {
                return false;
            }

            this.SetDivContent('idle_mess', 'Player Recon: In Progress');
            global.log(1, "Player Recon: In Progress");

            $.ajax({
                url: "http://apps.facebook.com/castle_age/battle.php",
                error:
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        global.error("ReconPlayers2.ajax", textStatus);
                    },
                success:
                    function (data, textStatus, XMLHttpRequest) {
                        try {
                            var found = 0;
                            global.log(2, "ReconPlayers.ajax: Checking data.");

                            $(data).find("img[src*='symbol_']").not("[src*='symbol_tiny_']").each(function (index) {
                                var UserRecord      = new caap.ReconRecord(),
                                    $tempObj        = $(this).parent().parent().parent().parent().parent(),
                                    tempArray       = [],
                                    txt             = '',
                                    regex           = new RegExp('(.+)\\s*\\(Level ([0-9]+)\\)\\s*Battle: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*War: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*([0-9]+)', 'i'),
                                    regex2          = new RegExp('(.+)\\s*\\(Level ([0-9]+)\\)\\s*Battle: ([A-Za-z ]+) \\(Rank ([0-9]+)\\)\\s*([0-9]+)', 'i'),
                                    entryLimit      = gm.getNumber('LimitTargets', 100),
                                    i               = 0,
                                    OldRecord       = null,
                                    reconRank       = gm.getNumber('ReconPlayerRank', 99),
                                    reconLevel      = gm.getNumber('ReconPlayerLevel', 999),
                                    reconARBase     = gm.getNumber('ReconPlayerARBase', 999),
                                    levelMultiplier = 0,
                                    armyRatio       = 0,
                                    goodTarget      = true;

                                if ($tempObj.length) {
                                    tempArray = $tempObj.find("a:first").attr("href").match(/user=([0-9]+)/);
                                    if (tempArray && tempArray.length === 2) {
                                        UserRecord.data.userID = parseInt(tempArray[1], 10);
                                    }

                                    for (i = 0; i < caap.ReconRecordArray.length; i += 1) {
                                        if (caap.ReconRecordArray[i].userID === UserRecord.data.userID) {
                                            UserRecord.data = caap.ReconRecordArray[i];
                                            caap.ReconRecordArray.splice(i, 1);
                                            global.log(2, "UserRecord exists. Loaded and removed.", UserRecord);
                                            break;
                                        }
                                    }

                                    tempArray = $(this).attr("src").match(/symbol_([0-9])\.jpg/);
                                    if (tempArray && tempArray.length === 2) {
                                        UserRecord.data.deityNum = parseInt(tempArray[1], 10);
                                    }

                                    txt = $.trim($tempObj.text());
                                    if (txt.length) {
                                        if (caap.battles.Freshmeat.warLevel) {
                                            tempArray = regex.exec(txt);
                                            if (!tempArray) {
                                                tempArray = regex2.exec(txt);
                                                caap.battles.Freshmeat.warLevel = false;
                                            }
                                        } else {
                                            tempArray = regex2.exec(txt);
                                            if (!tempArray) {
                                                tempArray = regex.exec(txt);
                                                caap.battles.Freshmeat.warLevel = true;
                                            }
                                        }

                                        if (tempArray) {
                                            UserRecord.data.aliveTime      = new Date().getTime();
                                            UserRecord.data.nameStr        = $.trim(tempArray[1]);
                                            UserRecord.data.levelNum       = parseInt(tempArray[2], 10);
                                            UserRecord.data.rankStr        = tempArray[3];
                                            UserRecord.data.rankNum        = parseInt(tempArray[4], 10);
                                            if (caap.battles.Freshmeat.warLevel) {
                                                UserRecord.data.warRankStr = tempArray[5];
                                                UserRecord.data.warRankNum = parseInt(tempArray[6], 10);
                                                UserRecord.data.armyNum    = parseInt(tempArray[7], 10);
                                            } else {
                                                UserRecord.data.armyNum    = parseInt(tempArray[5], 10);
                                            }

                                            if (UserRecord.data.levelNum - caap.stats.level > reconLevel) {
                                                global.log(2, 'Level above reconLevel max', reconLevel, UserRecord);
                                                goodTarget = false;
                                            } else if (caap.stats.rank.battle - UserRecord.data.rankNum > reconRank) {
                                                global.log(2, 'Rank below reconRank min', reconRank, UserRecord);
                                                goodTarget = false;
                                            } else {
                                                levelMultiplier = caap.stats.level / UserRecord.data.levelNum;
                                                armyRatio = reconARBase * levelMultiplier;
                                                if (armyRatio <= 0) {
                                                    global.log(2, 'Recon unable to calculate army ratio', reconARBase, levelMultiplier);
                                                    goodTarget = false;
                                                } else if (UserRecord.data.armyNum  > (caap.stats.army * armyRatio)) {
                                                    global.log(2, 'Army above armyRatio adjustment', armyRatio, UserRecord);
                                                    goodTarget = false;
                                                }
                                            }

                                            if (goodTarget) {
                                                while (caap.ReconRecordArray.length >= entryLimit) {
                                                    OldRecord = caap.ReconRecordArray.shift();
                                                    global.log(2, "Entry limit matched. Deleted an old record", OldRecord);
                                                }

                                                global.log(2, "UserRecord", UserRecord);
                                                caap.ReconRecordArray.push(UserRecord.data);
                                                found += 1;
                                            }
                                        } else {
                                            global.log(1, 'Recon can not parse target text string', txt);
                                        }
                                    } else {
                                        global.log(1, "Can't find txt in $tempObj", $tempObj);
                                    }
                                } else {
                                    global.log(1, "$tempObj is empty");
                                }
                            });

                            caap.SaveRecon();
                            caap.SetDivContent('idle_mess', 'Player Recon: Found:' + found + ' Total:' + caap.ReconRecordArray.length);
                            global.log(1, 'Player Recon: Found:' + found + ' Total:' + caap.ReconRecordArray.length);
                            window.setTimeout(function () {
                                caap.SetDivContent('idle_mess', '');
                            }, 5 * 1000);

                            global.log(2, "ReconPlayers.ajax: Done.", caap.ReconRecordArray);
                        } catch (err) {
                            global.error("ERROR in ReconPlayers.ajax: " + err);
                        }
                    }
            });

            schedule.Set('PlayerReconTimer', gm.getValue('PlayerReconRetry', 60), 60);
            return true;
        } catch (err) {
            global.error("ERROR in ReconPlayers:" + err);
            return false;
        }
    },

    currentPage: "",

    currentTab: "",

    waitMilliSecs: 5000,

    /////////////////////////////////////////////////////////////////////
    //                          MAIN LOOP
    // This function repeats continously.  In principle, functions should only make one
    // click before returning back here.
    /////////////////////////////////////////////////////////////////////

    actionDescTable: {
        AutoIncome        : 'Awaiting Income',
        AutoStat          : 'Upgrade Skill Points',
        MaxEnergyQuest    : 'At Max Energy Quest',
        PassiveGeneral    : 'Setting Idle General',
        Idle              : 'Idle Tasks',
        ImmediateBanking  : 'Immediate Banking',
        Battle            : 'Battling Players',
        MonsterReview     : 'Review Monsters/Raids',
        ImmediateAutoStat : 'Immediate Auto Stats',
        AutoElite         : 'Fill Elite Guard',
        AutoPotions       : 'Auto Potions',
        AutoAlchemy       : 'Auto Alchemy',
        AutoBless         : 'Auto Bless',
        AutoGift          : 'Auto Gifting',
        DemiPoints        : 'Demi Points First',
        Monsters          : 'Fighting Monsters',
        Heal              : 'Auto Healing',
        Bank              : 'Auto Banking',
        Lands             : 'Land Operations'
    },

    CheckLastAction: function (thisAction) {
        var lastAction = gm.getValue('LastAction', 'none');
        if (this.actionDescTable[thisAction]) {
            this.SetDivContent('activity_mess', 'Activity: ' + this.actionDescTable[thisAction]);
        } else {
            this.SetDivContent('activity_mess', 'Activity: ' + thisAction);
        }

        if (lastAction !== thisAction) {
            global.log(1, 'Changed from doing ' + lastAction + ' to ' + thisAction);
            gm.setValue('LastAction', thisAction);
        }
    },

    // The Master Action List
    masterActionList: {
        0x00: 'AutoElite',
        0x01: 'Heal',
        0x02: 'ImmediateBanking',
        0x03: 'ImmediateAutoStat',
        0x04: 'MaxEnergyQuest',
        0x05: 'DemiPoints',
        0x06: 'MonsterReview',
        0x07: 'Monsters',
        0x08: 'Battle',
        0x09: 'Quests',
        0x0A: 'Bank',
        0x0B: 'PassiveGeneral',
        0x0C: 'Lands',
        0x0D: 'AutoBless',
        0x0E: 'AutoStat',
        0x0F: 'AutoGift',
        0x10: 'AutoPotions',
        0x11: 'AutoAlchemy',
        0x12: 'Idle'
    },

    actionsList: [],

    MakeActionsList: function () {
        try {
            if (this.actionsList && this.actionsList.length === 0) {
                global.log(1, "Loading a fresh Action List");
                // actionOrder is a comma seperated string of action numbers as
                // hex pairs and can be referenced in the Master Action List
                // Example: "00,01,02,03,04,05,06,07,08,09,0A,0B,0C,0D,0E,0F,10,11,12"
                var action = '';
                var actionOrderArray = [];
                var masterActionListCount = 0;
                var actionOrderUser = gm.getValue("actionOrder", '');
                if (actionOrderUser !== '') {
                    // We are using the user defined actionOrder set in the
                    // Advanced Hidden Options
                    global.log(1, "Trying user defined Action Order");
                    // We take the User Action Order and convert it from a comma
                    // separated list into an array
                    actionOrderArray = actionOrderUser.split(",");
                    // We count the number of actions contained in the
                    // Master Action list
                    for (action in this.masterActionList) {
                        if (this.masterActionList.hasOwnProperty(action)) {
                            masterActionListCount += 1;
                            global.log(9, "Counting Action List", masterActionListCount);
                        } else {
                            global.log(1, "Error Getting Master Action List length!");
                            global.log(1, "Skipping 'action' from masterActionList: " + action);
                        }
                    }
                } else {
                    // We are building the Action Order Array from the
                    // Master Action List
                    global.log(1, "Building the default Action Order");
                    for (action in this.masterActionList) {
                        if (this.masterActionList.hasOwnProperty(action)) {
                            masterActionListCount = actionOrderArray.push(action);
                            global.log(9, "Action Added", action);
                        } else {
                            global.log(1, "Error Building Default Action Order!");
                            global.log(1, "Skipping 'action' from masterActionList: " + action);
                        }
                    }
                }

                // We notify if the number of actions are not sensible or the
                // same as in the Master Action List
                var actionOrderArrayCount = actionOrderArray.length;
                if (actionOrderArrayCount === 0) {
                    var throwError = "Action Order Array is empty! " + (actionOrderUser === "" ? "(Default)" : "(User)");
                    throw throwError;
                }

                if (actionOrderArrayCount < masterActionListCount) {
                    global.log(1, "Warning! Action Order Array has fewer orders than default!");
                }

                if (actionOrderArrayCount > masterActionListCount) {
                    global.log(1, "Warning! Action Order Array has more orders than default!");
                }

                // We build the Action List
                global.log(8, "Building Action List ...");
                for (var itemCount = 0; itemCount !== actionOrderArrayCount; itemCount += 1) {
                    var actionItem = '';
                    if (actionOrderUser !== '') {
                        // We are using the user defined comma separated list
                        // of hex pairs
                        actionItem = this.masterActionList[parseInt(actionOrderArray[itemCount], 16)];
                        global.log(9, "(" + itemCount + ") Converted user defined hex pair to action", actionItem);
                    } else {
                        // We are using the Master Action List
                        actionItem = this.masterActionList[actionOrderArray[itemCount]];
                        global.log(9, "(" + itemCount + ") Converted Master Action List entry to an action", actionItem);
                    }

                    // Check the Action Item
                    if (actionItem.length > 0 && typeof(actionItem) === "string") {
                        // We add the Action Item to the Action List
                        this.actionsList.push(actionItem);
                        global.log(9, "Added action to the list", actionItem);
                    } else {
                        global.log(1, "Error! Skipping actionItem");
                        global.log(1, "Action Item(" + itemCount + "): " + actionItem);
                    }
                }

                if (actionOrderUser !== '') {
                    global.log(1, "Get Action List: " + this.actionsList);
                }
            }
            return true;
        } catch (err) {
            // Something went wrong, log it and use the emergency Action List.
            global.error("ERROR in MakeActionsList: " + err);
            this.actionsList = [
                "AutoElite",
                "Heal",
                "ImmediateBanking",
                "ImmediateAutoStat",
                "MaxEnergyQuest",
                "DemiPoints",
                "MonsterReview",
                "Monsters",
                "Battle",
                "Quests",
                "Bank",
                "PassiveGeneral",
                "Lands",
                "AutoBless",
                "AutoStat",
                "AutoGift",
                'AutoPotions',
                "AutoAlchemy",
                "Idle"
            ];

            return false;
        }
    },

    MainLoop: function () {
        this.waitMilliSecs = 5000;
        // assorted errors...
        var href = window.location.href;
        if (href.indexOf('/common/error.html') >= 0) {
            global.log(1, 'detected error page, waiting to go back to previous page.');
            window.setTimeout(function () {
                window.history.go(-1);
            }, 30 * 1000);

            return;
        }

        if ($('#try_again_button').length) {
            global.log(1, 'detected Try Again message, waiting to reload');
            // error
            window.setTimeout(function () {
                window.history.go(0);
            }, 30 * 1000);

            return;
        }

        var locationFBMF = false;
        if (global.is_chrome) {
            if (href.indexOf('apps.facebook.com/reqs.php') >= 0 || href.indexOf('apps.facebook.com/home.php') >= 0 || href.indexOf('filter=app_46755028429') >= 0) {
                locationFBMF = true;
            }
        } else {
            if (href.indexOf('www.facebook.com/reqs.php') >= 0 || href.indexOf('www.facebook.com/home.php') >= 0 || href.indexOf('filter=app_46755028429') >= 0) {
                locationFBMF = true;
            }
        }

        if (locationFBMF) {
            this.AcceptGiftOnFB();
            this.WaitMainLoop();
            return;
        }

        //We don't need to send out any notifications
        var button = nHtml.FindByAttrContains(document.body, "a", "class", 'undo_link');
        if (button) {
            this.Click(button);
            global.log(1, 'Undoing notification');
        }

        var caapDisabled = gm.getValue('Disabled', false);
        if (caapDisabled) {
            if (global.is_chrome) {
                CE_message("disabled", null, caapDisabled);
            }

            this.WaitMainLoop();
            return;
        }

        if (!this.pageLoadOK) {
            var noWindowLoad = gm.getValue('NoWindowLoad', 0);

            if (noWindowLoad === 0) {
                schedule.Set('NoWindowLoadTimer', Math.min(Math.pow(2, noWindowLoad - 1) * 15, 3600));
                gm.setValue('NoWindowLoad', 1);
            } else if (schedule.Check('NoWindowLoadTimer')) {
                schedule.Set('NoWindowLoadTimer', Math.min(Math.pow(2, noWindowLoad - 1) * 15, 3600));
                gm.setValue('NoWindowLoad', noWindowLoad + 1);
                global.ReloadCastleAge();
            }

            global.log(1, 'Page no-load count: ' + noWindowLoad);
            this.pageLoadOK = this.GetStats();
            this.WaitMainLoop();
            return;
        } else {
            gm.setValue('NoWindowLoad', 0);
        }

        if (gm.getValue('caapPause', 'none') !== 'none') {
            this.caapDivObject.css({
                background : gm.getValue('StyleBackgroundDark', '#fee'),
                opacity    : gm.getValue('StyleOpacityDark', '1')
            });

            this.caapTopObject.css({
                background : gm.getValue('StyleBackgroundDark', '#fee'),
                opacity    : gm.getValue('StyleOpacityDark', '1')
            });

            this.WaitMainLoop();
            return;
        }

        if (this.WhileSinceDidIt('clickedOnSomething', 45) && this.waitingForDomLoad) {
            global.log(1, 'Clicked on something, but nothing new loaded.  Reloading page.');
            global.ReloadCastleAge();
        }

        if (this.AutoIncome()) {
            this.CheckLastAction('AutoIncome');
            this.WaitMainLoop();
            return;
        }

        this.MakeActionsList();
        var actionsListCopy = this.actionsList.slice();

        global.log(9, "Action List", actionsListCopy);
        if (!gm.getValue('ReleaseControl', false)) {
            actionsListCopy.unshift(gm.getValue('LastAction', 'Idle'));
        } else {
            gm.setValue('ReleaseControl', false);
        }

        global.log(9, 'Action List2', actionsListCopy);
        for (var action in actionsListCopy) {
            if (actionsListCopy.hasOwnProperty(action)) {
                global.log(8, 'Action', actionsListCopy[action]);
                if (this[actionsListCopy[action]]()) {
                    this.CheckLastAction(actionsListCopy[action]);
                    break;
                }
            }
        }

        this.WaitMainLoop();
    },

    WaitMainLoop: function () {
        this.waitForPageChange = true;
        nHtml.setTimeout(function () {
            caap.waitForPageChange = false;
            caap.MainLoop();
        }, caap.waitMilliSecs * (1 + Math.random() * 0.2));
    }
};
