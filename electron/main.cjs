// electron/main.cjs
// Processo principal do Electron (versão desktop / .exe do Riff Theory).
//
// O app é servido por um protocolo customizado "app://" que lê os arquivos de
// dist/. Assim os caminhos absolutos usados no código ("/home.png",
// "/banner-hero.png"...) continuam funcionando sem mexer no front-end, e o
// contexto é "seguro" (necessário pro getUserMedia do afinador).
const { app, BrowserWindow, protocol, net, shell, session } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const DEV_URL = "http://localhost:5173";
// "electron . --dev" carrega o servidor do Vite (hot reload) em vez do build.
const isDev = !app.isPackaged && process.argv.includes("--dev");

const DIST_DIR = path.join(__dirname, "..", "dist");

protocol.registerSchemesAsPrivileged([
    {
        scheme: "app",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
        },
    },
]);

function registrarProtocolo() {
    protocol.handle("app", (request) => {
        const url = new URL(request.url);
        let caminho = decodeURIComponent(url.pathname);
        if (caminho === "/" || caminho === "") caminho = "/index.html";

        const arquivo = path.normalize(path.join(DIST_DIR, caminho));

        // Impede sair da pasta dist/ (path traversal).
        if (!arquivo.startsWith(DIST_DIR)) {
            return new Response("Acesso negado", { status: 403 });
        }

        return net
            .fetch(pathToFileURL(arquivo).toString())
            .then((res) => (res.ok ? res : net.fetch(pathToFileURL(path.join(DIST_DIR, "index.html")).toString())))
            .catch(() => net.fetch(pathToFileURL(path.join(DIST_DIR, "index.html")).toString()));
    });
}

function criarJanela() {
    const janela = new BrowserWindow({
        width: 1100,
        height: 800,
        minWidth: 380,
        minHeight: 600,
        backgroundColor: "#0D0D0D",
        title: "Riff Theory",
        icon: path.join(__dirname, "..", "build", "icon.png"),
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    janela.setMenuBarVisibility(false);

    // Links externos (cifras, etc.) abrem no navegador padrão, não numa janela do app.
    janela.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/i.test(url)) shell.openExternal(url);
        return { action: "deny" };
    });

    janela.webContents.on("will-navigate", (event, url) => {
        const interno = url.startsWith("app://") || url.startsWith(DEV_URL);
        if (!interno) {
            event.preventDefault();
            if (/^https?:/i.test(url)) shell.openExternal(url);
        }
    });

    if (isDev) {
        janela.loadURL(DEV_URL);
    } else {
        janela.loadURL("app://rifftheory/index.html");
    }
}

app.whenReady().then(() => {
    registrarProtocolo();

    // Só libera o microfone (afinador); nega qualquer outra permissão.
    session.defaultSession.setPermissionRequestHandler((_wc, permissao, callback) => {
        callback(permissao === "media");
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permissao) => permissao === "media");

    criarJanela();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) criarJanela();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
