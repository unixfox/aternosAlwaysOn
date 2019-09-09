const axios = require('axios');
const qs = require('qs');
const setCookie = require('set-cookie-parser');
const WebSocket = require('ws');
const mc = require('minecraft-protocol');
const tokens = require('prismarine-tokens');
const crypto = require('crypto');
const fs = require('fs');
const TOML = require('@iarna/toml');
require('better-logging')(console, {
    format: ctx => `${ctx.date} ${ctx.time24} ${ctx.type} ${ctx.msg}`
});

function randomString(length) {
    return Array(length + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, length);
}

let aternosSEC = {
    key: randomString(16),
    value: randomString(16)
}

function checkFileExist(path, exit) {
    if (fs.existsSync(path))
        return (true);
    else
        if (exit) {
            console.error("The file " + path + " doesn't exist, can't continue. Please check the documentation for further details.");
            process.exit(1);
        }
        else
            return (false);
}

checkFileExist("config.toml", true);
const configFile = TOML.parse(fs.readFileSync('./config.toml'));

const data = {
    user: configFile["aternos"].username,
    password: crypto.createHash('md5').update(configFile["aternos"].password).digest("hex")
};

axios({
    method: 'post',
    url: 'https://aternos.org/panel/ajax/account/login.php',
    params: {
        ASEC: aternosSEC.key + ":" + aternosSEC.key
    },
    data: qs.stringify(data),
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
        'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + ';'
    }
}).then(response => {
    aternosSessionCookie = setCookie.parse(response.headers['set-cookie'])[2];

    const reconnectInterval = 1000 * 60;

    aternosSEC = {
        key: randomString(16),
        value: randomString(16)
    }

    const connect = function () {
        const ws = new WebSocket('wss://aternos.org/hermes/', {
            headers: {
                cookie: 'ATERNOS_SESSION=' + aternosSessionCookie.value,
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
            }
        });
        ws.on('message', function incoming(data) {
            const response = JSON.parse(data);
            if (response.type == "status") {
                const message = JSON.parse(response.message);
                switch (message.class) {
                    case 'offline':
                        console.warn("Server offline, restarting it...");
                        aternosSEC = {
                            key: randomString(16),
                            value: randomString(16)
                        }
                        setTimeout(function () {
                            axios({
                                method: 'get',
                                url: 'https://aternos.org/panel/ajax/start.php?headstart=0',
                                params: {
                                    ASEC: aternosSEC.key + ":" + aternosSEC.key
                                },
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
                                    'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + '; ATERNOS_SESSION=' + aternosSessionCookie.value + ';'
                                }
                            });
                        }, Math.floor(Math.random() * 20000));
                        break;
                    case 'online':
                        if (message.countdown != false) {
                            console.info("Server online without any player, spawning a bot...");
                            const options = {
                                host: message.dynip.split(":")[0],
                                port: message.dynip.split(":")[1],
                                username: configFile["minecraft"].username,
                                password: configFile["minecraft"].password,
                                tokensLocation: './bot_tokens.json'
                            };
                            setTimeout(function () {
                                tokens.use(options, function (_err, _opts) {
                                    if (_err) throw _err;
                                    mc.createClient(_opts);
                                });
                            }, Math.floor(Math.random() * 20000));
                        }
                        break;
                    case 'queueing':
                        if (message.queue.pending == "pending") {
                            console.warn("Server still in queue, confirming that we are still in the queue...");
                            aternosSEC = {
                                key: randomString(16),
                                value: randomString(16)
                            }
                            setTimeout(function () {
                                axios({
                                    method: 'get',
                                    url: 'https://aternos.org/panel/ajax/confirm.php',
                                    params: {
                                        ASEC: aternosSEC.key + ":" + aternosSEC.key
                                    },
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
                                        'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + '; ATERNOS_SESSION=' + aternosSessionCookie.value + ';'
                                    }
                                });
                            }, Math.floor(Math.random() * 20000));
                        }
                }
            }
        });
        ws.on('close', function () {
            console.warn('Lost connection with the server, restarting socket...');
            setTimeout(connect, reconnectInterval);
        });
    };

    connect();

    axios({
        method: 'get',
        url: 'https://aternos.org/panel/ajax/status.php',
        params: {
            ASEC: aternosSEC.key + ":" + aternosSEC.key
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
            'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + '; ATERNOS_SESSION=' + aternosSessionCookie.value + ';'
        }
    }).then(response => {
        switch (response.data.class) {
            case 'offline':
                console.warn("Server offline, restarting it...");
                aternosSEC = {
                    key: randomString(16),
                    value: randomString(16)
                }
                axios({
                    method: 'get',
                    url: 'https://aternos.org/panel/ajax/start.php?headstart=0',
                    params: {
                        ASEC: aternosSEC.key + ":" + aternosSEC.key
                    },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
                        'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + '; ATERNOS_SESSION=' + aternosSessionCookie.value + ';'
                    }
                });
                break;
            case 'online':
                if (response.data.countdown != false) {
                    console.info("Server online without any player, spawning a bot...");

                    const options = {
                        host: response.data.dynip.split(":")[0],
                        port: response.data.dynip.split(":")[1],
                        username: configFile["minecraft"].username,
                        password: configFile["minecraft"].password,
                        tokensLocation: './bot_tokens.json'
                    };
                    tokens.use(options, function (_err, _opts) {
                        if (_err) throw _err;
                        mc.createClient(_opts);
                    });

                    aternosSEC = {
                        key: randomString(16),
                        value: randomString(16)
                    }
                    axios({
                        method: 'get',
                        url: 'https://aternos.org/panel/ajax/start.php?headstart=0',
                        params: {
                            ASEC: aternosSEC.key + ":" + aternosSEC.key
                        },
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
                            'cookie': 'ATERNOS_SEC_' + aternosSEC.key + '=' + aternosSEC.key + '; ATERNOS_SESSION=' + aternosSessionCookie.value + ';'
                        }
                    });
                }
                break
        }
    });

});