import nx from "@nx/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
      "ignores": [
        "**/dist",
        "**/vite.config.*.timestamp*"
      ]
    },
    {
        files: [
            "apps/user/src/**/*.{ts,tsx,js,jsx}",
            "libs/user/ui/src/**/*.{ts,tsx,js,jsx}"
        ],
        plugins: {
            "jsx-a11y": jsxA11y
        },
        rules: {
            ...jsxA11y.flatConfigs.recommended.rules,
            ...Object.fromEntries(
                Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, "warn"])
            )
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        plugins: {
            "react-hooks": reactHooks
        },
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$",
                        "^.*/tools/plugins/"
                    ],
                    depConstraints: [
                        {
                            sourceTag: "scope:user",
                            onlyDependOnLibsWithTags: [
                                "scope:user",
                                "scope:shared"
                            ]
                        },
                        {
                            sourceTag: "scope:admin",
                            onlyDependOnLibsWithTags: [
                                "scope:admin",
                                "scope:shared"
                            ]
                        },
                        {
                            sourceTag: "scope:shared",
                            onlyDependOnLibsWithTags: [
                                "scope:shared"
                            ]
                        },
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: [
                                "type:ui",
                                "type:types",
                                "type:constants",
                                "type:util"
                            ]
                        },
                        {
                            sourceTag: "type:ui",
                            onlyDependOnLibsWithTags: [
                                "type:ui",
                                "type:types",
                                "type:constants",
                                "type:util"
                            ]
                        },
                        {
                            sourceTag: "type:util",
                            onlyDependOnLibsWithTags: [
                                "type:util",
                                "type:types",
                                "type:constants"
                            ]
                        },
                        {
                            sourceTag: "type:types",
                            onlyDependOnLibsWithTags: [
                                "type:types",
                                "type:constants"
                            ]
                        },
                        {
                            sourceTag: "type:constants",
                            onlyDependOnLibsWithTags: [
                                "type:constants"
                            ]
                        }
                    ]
                }
            ],
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn"
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
