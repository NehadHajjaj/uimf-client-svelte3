﻿import * as alertifyLib from "alertifyjs";
import Menu from "./components/Menu.svelte";
import * as handlers from "./core/handlers";
import { AppRouter } from "./AppRouter";
import controlRegister from "./ControlRegister";
import { UmfApp, UmfServer } from "core/framework";
import { setupI18n,initI18n } from "./services/Translation.js";


const alertify = alertifyLib.default;


alertify.defaults = {
	closable: false,
	transition: "pulse",
	notifier: {
		delay: 8,
		position: "bottom-right",
		closeButton: true
	},
	glossary: {
		title: "AlertifyJS",
		ok: "Yes",
		cancel: "No"
	},

	// theme settings
	theme: {
		// class name attached to prompt dialog input textbox.
		input: "ajs-input",
		// class name attached to ok button
		ok: "ajs-ok",
		// class name attached to cancel button
		cancel: "ajs-cancel"
	},
	// global hooks
	hooks: {
		// invoked before initializing any dialog
		preinit(instance) { },
		// invoked after initializing any dialog
		postinit(instance) { }
	}
};

const alertifyErrorMsg: any[] = [];
class MyApp extends UmfApp {
	constructor(theServer: UmfServer) {
		super(theServer, controlRegister);
	}

	public showError(message: string): void {
		const msg = alertify.error(message);
		alertifyErrorMsg.push(msg);
	}
}

const server = new UmfServer(
	"/api/form/metadata",
    "/api/form/run",
    "/api/form/menu",
	"/document/UploadDocument");

const app = new MyApp(server);

// Create a global variable, which can be accessed from any component.
(window as any).uimfapp = app;

app.on("request:started", (request) => {
	showLoader();
});

document.addEventListener("lang:changed", (e: any) => {
	if (e.detail != null) {
		setupI18n({
			withLocale: e.detail.lang === "en-US" ? "en" : "ar"
		});
	}
});

initI18n();

app.on("request:completed", (error) => {
	if (error != null) {
		app.showError(error);
	}

	hideLoader();
});

app.load().then((response) => {
	const router = new AppRouter(document.getElementById("main"), app);
	app.useRouter(router);
	router.on("router:activated", () => {
		for (const msg of alertifyErrorMsg) {
			msg.dismiss();
		}
	});

	app.registerResponseHandler(new handlers.FormComponentResponseHandler());
	app.registerResponseHandler(new handlers.MessageResponseHandler());
	app.registerResponseHandler(new handlers.ReloadResponseHandler((form, inputFieldValues) => {
		return app.load().then((t) => {
				buildMenu(app);
			if (form === "home") {
				return "#/form/dashboard";
			}
			return app.makeUrl(form, inputFieldValues);
		});
	}));

	app.registerResponseHandler(new handlers.RedirectResponseHandler((form, inputFieldValues) => {
		app.go(form, inputFieldValues);
	}));

		buildMenu(app);
});


function buildMenu(theApp: UmfApp): void {
	// Remove old menu.
	const myNode = document.getElementById("topmenu");
	while (myNode.firstChild) {
		myNode.removeChild(myNode.firstChild);
	}

	// tslint:disable-next-line:no-unused-expression
	new Menu({
		target: document.getElementById("topmenu"),
		props: {
			forms: theApp.forms,
			menu: theApp.menu,
			app: theApp,
			makeUrl: (formId: string, inputFieldValues: any) => theApp.makeUrl(formId, inputFieldValues)
		}
	});
}

function showLoader(): void {
	const progress = document.getElementById("progress");
	progress.setAttribute("style", "width:50%");
	const loader = document.getElementById("loader");
	loader.setAttribute("class", "");
}

function hideLoader(): void {
	const loader = document.getElementById("loader");
	const progress = document.getElementById("progress");
	progress.setAttribute("style", "width:100%");

	setTimeout(function (): void {
		loader.setAttribute("class", "d-none");
	}, 500);
}
