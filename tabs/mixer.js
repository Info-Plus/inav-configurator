/*global $,helper,mspHelper,MSP,GUI,SERVO_RULES,MOTOR_RULES,MIXER_CONFIG,googleAnalytics*/
'use strict';

TABS.mixer = {};

TABS.mixer.initialize = function (callback, scrollPosition) {

    let loadChainer = new MSPChainerClass(),
        saveChainer = new MSPChainerClass(),
        currentPlatform,
        currentMixerPreset,
        $servoMixTable,
        $servoMixTableBody,
        $motorMixTable,
        $motorMixTableBody;

    if (GUI.active_tab != 'mixer') {
        GUI.active_tab = 'mixer';
        googleAnalytics.sendAppView('Mixer');
    }

    loadChainer.setChain([
        mspHelper.loadMixerConfig,
        mspHelper.loadMotors,
        mspHelper.loadServoMixRules,
        mspHelper.loadMotorMixRules
    ]);
    loadChainer.setExitPoint(loadHtml);
    loadChainer.execute();

    saveChainer.setChain([
        mspHelper.saveMixerConfig,
        mspHelper.sendServoMixer,
        mspHelper.sendMotorMixer,
        mspHelper.saveToEeprom
    ]);
    saveChainer.setExitPoint(reboot);

    function reboot() {
        //noinspection JSUnresolvedVariable
        GUI.log(chrome.i18n.getMessage('configurationEepromSaved'));

        GUI.tab_switch_cleanup(function() {
            MSP.send_message(MSPCodes.MSP_SET_REBOOT, false, false, reinitialize);
        });
    }

    function reinitialize() {
        //noinspection JSUnresolvedVariable
        GUI.log(chrome.i18n.getMessage('deviceRebooting'));
        GUI.handleReconnect($('.tab_mixer a'));
    }

    function loadHtml() {
        $('#content').load("./tabs/mixer.html", processHtml);
    }

    function renderServoMixRules() {
        /*
         * Process servo mix table UI
         */
        let rules = SERVO_RULES.get();
        $servoMixTableBody.find("*").remove();
        for (let servoRuleIndex in rules) {
            if (rules.hasOwnProperty(servoRuleIndex)) {
                const servoRule = rules[servoRuleIndex];

                $servoMixTableBody.append('\
                    <tr>\
                    <td><input type="number" class="mix-rule-servo" step="1" min="0" max="7" /></td>\
                    <td><select class="mix-rule-input"></select></td>\
                    <td><input type="number" class="mix-rule-rate" step="1" min="-100" max="100" /></td>\
                    <td><input type="number" class="mix-rule-speed" step="1" min="0" max="255" /></td>\
                    <td><span class="btn default_btn narrow red"><a href="#" data-role="role-servo-delete" data-i18n="servoMixerDelete"></a></span></td>\
                    </tr>\
                ');

                const $row = $servoMixTableBody.find('tr:last');

                GUI.fillSelect($row.find(".mix-rule-input"), FC.getServoMixInputNames(), servoRule.getInput());
                
                $row.find(".mix-rule-input").val(servoRule.getInput()).change(function () {
                    servoRule.setInput($(this).val());
                });

                $row.find(".mix-rule-servo").val(servoRule.getTarget()).change(function () {
                    servoRule.setTarget($(this).val());
                });

                $row.find(".mix-rule-rate").val(servoRule.getRate()).change(function () {
                    servoRule.setRate($(this).val());
                });

                $row.find(".mix-rule-speed").val(servoRule.getSpeed()).change(function () {
                    servoRule.setSpeed($(this).val());
                });
                
                $row.find("[data-role='role-servo-delete']").attr("data-index", servoRuleIndex);
            }

        }
        localize();
    }

    function renderMotorMixRules() {

        /*
         * Process motor mix table UI
         */
        var rules = MOTOR_RULES.get();
        $motorMixTableBody.find("*").remove();
        let index = 0;
        for (const i in rules) {
            if (rules.hasOwnProperty(i)) {
                const rule = rules[i];
                index++;

                $motorMixTableBody.append('\
                    <tr>\
                    <td><span class="mix-rule-motor"></span></td>\
                    <td><input type="number" class="mix-rule-throttle" step="0.001" min="0" max="1" /></td>\
                    <td><input type="number" class="mix-rule-roll" step="0.001" min="-2" max="2" /></td>\
                    <td><input type="number" class="mix-rule-pitch" step="0.001" min="-2" max="2" /></td>\
                    <td><input type="number" class="mix-rule-yaw" step="0.001" min="-2" max="2" /></td>\
                    <td><span class="btn default_btn narrow red"><a href="#" data-role="role-motor-delete" data-i18n="servoMixerDelete"></a></span></td>\
                    </tr>\
                ');

                const $row = $motorMixTableBody.find('tr:last');

                $row.find('.mix-rule-motor').html(index);
                $row.find('.mix-rule-throttle').val(rule.getThrottle()).change(function () {
                    rule.setThrottle($(this).val());
                });
                $row.find('.mix-rule-roll').val(rule.getRoll()).change(function () {
                    rule.setRoll($(this).val());
                });
                $row.find('.mix-rule-pitch').val(rule.getPitch()).change(function () {
                    rule.setPitch($(this).val());
                });
                $row.find('.mix-rule-yaw').val(rule.getYaw()).change(function () {
                    rule.setYaw($(this).val());
                });
                $row.find("[data-role='role-motor-delete']").attr("data-index", i);
            }

        }
        localize();
    }

    function saveAndReboot() {

        /*
         * Send tracking
         */
        googleAnalytics.sendEvent('Mixer', 'Platform type', helper.platform.getList()[MIXER_CONFIG.platformType].name);
        googleAnalytics.sendEvent('Mixer', 'Mixer preset',  helper.mixer.getById(MIXER_CONFIG.appliedMixerPreset).name);

        /*
         * Send mixer rules
         */
        SERVO_RULES.cleanup();
        SERVO_RULES.inflate();
        MOTOR_RULES.cleanup();
        MOTOR_RULES.inflate();
        saveChainer.execute();
    }

    function processHtml() {

        if (!FC.isNewMixer()) {
            $('#mixer-hidden-content').removeClass("is-hidden");
            $('#mixer-main-content').remove();
        }

        $servoMixTable = $('#servo-mix-table');
        $servoMixTableBody = $servoMixTable.find('tbody');
        $motorMixTable = $('#motor-mix-table');
        $motorMixTableBody = $motorMixTable.find('tbody');

        function fillMixerPreset() {
            let mixers = helper.mixer.getByPlatform(MIXER_CONFIG.platformType);

            $mixerPreset.find("*").remove();
            for (i in mixers) {
                if (mixers.hasOwnProperty(i)) {
                    let m = mixers[i];
                    $mixerPreset.append('<option value="' + m.id + '">' + m.name + '</option>');
                }
            }
        }

        let $platformSelect = $('#platform-type'),
            platforms = helper.platform.getList(),
            $hasFlapsWrapper = $('#has-flaps-wrapper'),
            $hasFlaps = $('#has-flaps'),
            $mixerPreset = $('#mixer-preset'),
            modal;

        $platformSelect.find("*").remove();

        for (let i in platforms) {
            if (platforms.hasOwnProperty(i)) {
                let p = platforms[i];
                $platformSelect.append('<option value="' + p.id + '">' + p.name + '</option>');
            }
        }

        $platformSelect.change(function () {
            MIXER_CONFIG.platformType = parseInt($platformSelect.val(), 10);
            currentPlatform = helper.platform.getById(MIXER_CONFIG.platformType);

            if (currentPlatform.flapsPossible) {
                $hasFlapsWrapper.removeClass('is-hidden');
            } else {
                $hasFlapsWrapper.addClass('is-hidden');
            }

            fillMixerPreset();
            $mixerPreset.change();
        });

        currentPlatform = helper.platform.getById(MIXER_CONFIG.platformType);
        $platformSelect.val(MIXER_CONFIG.platformType).change();

        $mixerPreset.change(function () {
            const presetId = parseInt($mixerPreset.val(), 10);
            currentMixerPreset = helper.mixer.getById(presetId);
            
            MIXER_CONFIG.appliedMixerPreset = presetId;

            $('.mixerPreview img').attr('src', './resources/motor_order/'
                + currentMixerPreset.image + '.svg');
        });

        if (MIXER_CONFIG.appliedMixerPreset > -1) {
            $mixerPreset.val(MIXER_CONFIG.appliedMixerPreset).change();
        } else {
            $mixerPreset.change();
        }

        modal = new jBox('Modal', {
            width: 480,
            height: 240,
            closeButton: 'title',
            animation: false,
            attach: $('#load-and-apply-mixer-button'),
            title: chrome.i18n.getMessage("mixerApplyModalTitle"),
            content: $('#mixerApplyContent')
        });

        $('#execute-button').click(function () {
            helper.mixer.loadServoRules(currentMixerPreset);
            helper.mixer.loadMotorRules(currentMixerPreset);
            renderServoMixRules();
            renderMotorMixRules();
            modal.close();
            saveAndReboot();
        });

        $('#load-mixer-button').click(function () {
            helper.mixer.loadServoRules(currentMixerPreset);
            helper.mixer.loadMotorRules(currentMixerPreset);
            renderServoMixRules();
            renderMotorMixRules();
        });

        $servoMixTableBody.on('click', "[data-role='role-servo-delete']", function (event) {
            SERVO_RULES.drop($(event.currentTarget).attr("data-index"));
            renderServoMixRules();
        });

        $motorMixTableBody.on('click', "[data-role='role-motor-delete']", function (event) {
            MOTOR_RULES.drop($(event.currentTarget).attr("data-index"));
            renderMotorMixRules();
        });

        $("[data-role='role-servo-add']").click(function () {
            if (SERVO_RULES.hasFreeSlots()) {
                SERVO_RULES.put(new ServoMixRule(0, 0, 100, 0));
                renderServoMixRules();
            }
        });

        $("[data-role='role-motor-add']").click(function () {
            if (MOTOR_RULES.hasFreeSlots()) {
                MOTOR_RULES.put(new MotorMixRule(1, 0, 0, 0));
                renderMotorMixRules();
            }
        });

        $('#save-button').click(saveAndReboot);

        renderServoMixRules();
        renderMotorMixRules();

        localize();
        GUI.content_ready(callback);
    }

};

TABS.mixer.cleanup = function (callback) {
    if (callback) callback();
};