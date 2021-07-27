export class ProxyConfig {
    FetchConfig: {
        headers: {
            origin: "http://localhost:8010";
            host: "gate.aa.plenexy.digital";
            referer: "http://localhost:8010/";
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0";
        };
    };

    ExpressConfig: {
        port: 3002;
        proxyUrl: "https://gate.aa.plenexy.digital";
        useCors: true;
        corsOptions: {
            credentials: true;
            origin: true;
            allowedHeaders: "Origin, Content-Type, X-Requested-With, Accept, X-XSRF-TOKEN";
        };
    };
}
