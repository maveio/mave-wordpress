=== Mave Video ===
Contributors: davidvanleeuwen
Tags: video, media, block, gutenberg, upload
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Upload, choose, and embed Mave videos from the WordPress block editor.

== Description ==

Mave adds a privacy-friendly video block to WordPress. Upload videos to Mave,
choose existing videos from your Mave library, and embed a fast, cookieless
player in the block editor.

= Features =

* Mave Video block for Gutenberg.
* Direct uploads to Mave.
* Mave library picker with collection support.
* Global player defaults with per-block overrides.
* [mave_video] shortcode support.

== External services ==

This plugin requires Mave, an external video hosting, upload, playback, and
privacy-friendly analytics service. Mave is provided by Mave and uses the
mave.io and video-dns.com domains listed below.

Mave service: https://www.mave.io/
Terms of Use: https://www.mave.io/terms
Privacy Policy: https://www.mave.io/privacy

Data is sent to Mave under these conditions:

* When an administrator configures a Mave API key, the WordPress server sends
  authenticated requests to api.mave.io to list videos and collections. These
  requests include the API key and list parameters such as page, page size,
  collection id, and archived filter.
* When an editor uploads a file through the Mave block, WordPress creates a
  short-lived upload token. The editor's browser connects to dash.mave.io for
  upload status and uploads the selected file to upload.mave.io. Uploads send
  the file, filename, file type, upload id, and short-lived upload token.
* When a Mave block or shortcode is rendered, the browser loads the Mave
  component module from cdn.video-dns.com and loads thumbnails, video files, and
  player resources from video-dns.com CDN endpoints.
* The Mave player may send aggregate playback events to metrics.video-dns.com.
  These events include the embed id and playback data needed for video
  analytics. Mave analytics do not use cookies, cross-site tracking,
  advertising identifiers, or viewer profiling.

The Mave API key is stored server-side in WordPress options and is not exposed
to public visitors.

== Installation ==

1. Create or sign in to a Mave account.
2. Copy your Mave API key from the Mave dashboard.
3. Install and activate the plugin in WordPress.
4. Open Settings > Mave and paste your API key.
5. Optionally set an upload target. A Mave collection id scopes uploads and the
   block picker to that collection.
6. Add a Mave Video block to a page or post.

== Frequently Asked Questions ==

= Do I need a Mave account? =

Yes. A Mave account and API key are required to upload, choose, and embed Mave
videos from WordPress.

= Is the Mave API key exposed to editors? =

No. The API key is stored server-side in WordPress options. Editor requests go
through WordPress REST routes.

= Can uploads be scoped to a collection? =

Yes. Set Upload target in Settings > Mave to a Mave collection id.

= Can each player use a different theme or color? =

Yes. Configure global defaults in Settings > Mave, then override theme or color
from the block settings sidebar when needed.

== Screenshots ==

1. Choose an existing Mave video from the block editor picker.
2. Preview a selected Mave video and adjust player options in the block sidebar.

== Changelog ==

= 0.0.1 =
* Initial public release.
