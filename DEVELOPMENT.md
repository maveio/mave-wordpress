# Development

## Local WordPress

From this directory:

```bash
npm install
npm run start
```

`@wordpress/env` starts WordPress at `http://localhost:8888`.

Default admin credentials:

```text
Username: admin
Password: password
```

The local WordPress runtime mounts `.wp-env-plugin/mave-wordpress`, a generated
copy of the plugin. This prevents deleting the plugin in WordPress admin from
deleting the source directory.

If you need the Docker runtime instead, use:

```bash
npm run start:docker
```

If the plugin is not active in Docker:

```bash
npm run docker:plugin:activate
```

## Checks

Run syntax checks before committing:

```bash
node --check assets/js/editor.js
node --check assets/js/frontend.js
find . -name '*.php' -not -path './wordpress/*' -print -exec php -l {} \;
```

Run WordPress Plugin Check before preparing a WordPress.org release:

```bash
npm run plugin-check
```

`plugin-check` starts a separate Docker `wp-env` site on port 8890, builds the
release zip, installs that packaged copy, installs the official Plugin Check
plugin, and runs the WordPress.org plugin repository check category through
WP-CLI. The default Playground-based development site can stay running because
it does not support WP-CLI commands.

Stop the Plugin Check environment when you no longer need it:

```bash
npm run plugin-check:stop
```
