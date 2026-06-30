=== Mave Video ===
Contributors: mave
Tags: video, media, block, gutenberg, upload
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Upload, choose, and embed Mave videos from the WordPress block editor.

== Description ==

Mave adds a Gutenberg block for embedding videos hosted in Mave. Editors can
choose an existing Mave video, upload a new video directly to Mave, and adjust
player options per block.

The plugin stores the Mave API key server-side in WordPress. The editor uses
WordPress REST routes and short-lived upload tokens scoped to the configured
Mave space or collection.

== Third-party services ==

This plugin connects to Mave, an external video hosting and playback service,
when a site administrator configures a Mave API key and editors use the Mave
block or shortcode.

Mave service: https://www.mave.io/
Terms of Use: https://www.mave.io/terms
Privacy Policy: https://www.mave.io/privacy

The plugin uses Mave services in these cases:

* The WordPress server sends authenticated API requests to Mave to list videos
  and collections for the block picker.
* The editor requests short-lived upload tokens from WordPress and uploads video
  files directly to the configured Mave upload endpoint.
* The editor and front end load the Mave component module from the configured
  component module URL so the mave-player and mave-upload web components can
  render and operate.
* Public pages that contain a Mave player load thumbnails, video playback
  assets, and related player resources from the configured Mave CDN endpoints.
* The Mave player may send privacy-friendly aggregate playback events to the
  configured Mave metrics endpoint. Mave uses these events to provide video
  analytics without cookies, cross-site tracking, advertising identifiers, or
  viewer profiling.

The Mave API key is stored in WordPress options and is not exposed to public
visitors. Advanced settings allow administrators to change the Mave service
endpoints when using another Mave environment.

= Features =

* Mave Video block.
* Direct Mave uploads.
* Mave library picker with collection support.
* Global player theme and color defaults.
* Per-block player overrides.
* [mave_video] shortcode support.

== Installation ==

1. Upload the plugin files to the /wp-content/plugins/mave-video directory,
   or install the plugin zip through the WordPress admin.
2. Activate the plugin.
3. Open Settings > Mave.
4. Paste your Mave API key.
5. Optionally set an upload target. A Mave collection id scopes uploads and the
   block picker to that collection.

== Frequently Asked Questions ==

= Is the Mave API key exposed to editors? =

No. The API key is stored server-side in WordPress options. Editor requests go
through WordPress REST routes.

= Can uploads be scoped to a collection? =

Yes. Set Upload target in Settings > Mave to a Mave collection id.

= Can each player use a different theme or color? =

Yes. Configure global defaults in Settings > Mave, then override theme or color
from the block settings sidebar when needed.

== Changelog ==

= 0.0.1 =
* Initial public release.
