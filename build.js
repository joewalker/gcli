{
    baseUrl: "./lib",
    dir: "build",

    //- "closure": uses Google's Closure Compiler in simple optimization
    //mode to minify the code.
    //- "closure.keepLines": Same as closure option, but keeps line returns
    //in the minified files.
    //- "none": no minification will be done.
    optimize: "closure.keepLines",
    inlineText: true,
    useStrict: false,

    pragmas: {
        jquery: false,
        requireExcludeModify: true,
        requireExcludePlugin: false,
        requireExcludePageLoad: false
    },

    skipPragmas: false,
    execModules: false,
    skipModuleInsertion: false,

    modules: [{
        name: "cockpit",
        include: [ "cockpit" ],
        includeRequire: false
    }]
}
