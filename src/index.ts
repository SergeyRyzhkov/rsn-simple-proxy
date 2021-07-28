/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Request, Response, NextFunction } from "express";
import { fetchWrapper } from "./FetchWrapper";
import { ProxyConfig } from "./ProxyConfig";
import { ConfigManager } from "./ConfigManager";

const config: ProxyConfig = ConfigManager.instance.getOptionsAsClass(ProxyConfig);

export class ExpressApplication {
    private app = express();

    public async start() {
        try {
            await this.initialize();

            const server = this.app.listen(config.ExpressConfig.port, () => {
                if (process.send) {
                    process.send("ready");
                }
            });

            process.on("unhandledRejection", (err) => {
                server.close(() => process.exit(1));
            });

            return this.app;
        } catch (exc) {
            if (process.send) {
                process.send("stop");
            }
        }
    }

    private async initialize() {
        if (config.ExpressConfig.useCors) {
            this.app.options("*", cors(config.ExpressConfig.corsOptions));
            this.app.use(cors(config.ExpressConfig.corsOptions));
        }

        this.app.use(express.json());
        this.app.use(cookieParser());
        // this.app.use(headerMiddleware());

        this.app.use(proxyRoute());
    }
}

export const proxyRoute = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const proxyUrl = `${config.ExpressConfig.proxyUrl}${req.url}`;
            const fetchResponse = await prepareFetchResult(req, proxyUrl);
            replaceResponseCookie(fetchResponse, res);
            res.status(fetchResponse.status || 200);
            res.json(fetchResponse.data);
            next();
        } catch (errResponse) {
            res.status(errResponse.status || 500);
            res.json(errResponse);
            next(errResponse);
        }
    };
};

const prepareFetchResult = (req: Request, url: string) => {
    const addHeader: any = {};
    addHeader.headers = {
        ...req.headers,
        "user-agent": config.FetchConfig.headers["user-agent"],
        origin: config.FetchConfig.headers.origin,
        host: config.FetchConfig.headers.host,
        referer: config.FetchConfig.headers.referer,
    };

    if (req.method === "GET") {
        return fetchWrapper.getJSON(url, addHeader);
    }
    if (req.method === "POST") {
        return fetchWrapper.post(url, addHeader, req.body);
    }
    if (req.method === "PUT") {
        return fetchWrapper.put(url, addHeader, req.body);
    }
    if (req.method === "PATCH") {
        return fetchWrapper.patch(url, addHeader, req.body);
    }
    if (req.method === "DELETE") {
        return fetchWrapper.delete(url, addHeader, req.body);
    }
};

const replaceResponseCookie = (
    fetchResponse: { data: any; status: number; statusText: string; headers: Headers },
    expressResponse: Response
) => {
    const cookies: string[] = !!fetchResponse && !!fetchResponse.headers ? fetchResponse.headers["set-cookie"] : [];

    cookies.forEach((element) => {
        const cookieName = element.split("=")[0];
        const cookieVal = element.split("=")[1].split(";")[0];
        expressResponse.cookie(cookieName, cookieVal);
    });
};

(async () => {
    new ExpressApplication().start();
})();
