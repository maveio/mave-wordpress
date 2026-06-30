(function (wp) {
  var el = wp.element.createElement;
  var useEffect = wp.element.useEffect;
  var useMemo = wp.element.useMemo;
  var useRef = wp.element.useRef;
  var useState = wp.element.useState;
  var __ = wp.i18n.__;
  var sprintf = wp.i18n.sprintf;
  var settings = window.MaveWordPress || {};
  var LIBRARY_PER_PAGE = 15;
  var SEARCH_PER_PAGE = 100;

  if (settings.nonce && wp.apiFetch && wp.apiFetch.createNonceMiddleware) {
    wp.apiFetch.use(wp.apiFetch.createNonceMiddleware(settings.nonce));
  }

  function restPath(path) {
    return '/mave/v1' + path;
  }

  function spaceHashFromEmbedId(embedId) {
    embedId = String(embedId || '').trim();

    if (embedId.length <= 5) {
      return '';
    }

    return embedId.slice(0, 5);
  }

  function embedHashFromEmbedId(embedId) {
    embedId = String(embedId || '').trim();

    if (embedId.length <= 5) {
      return '';
    }

    return embedId.slice(5);
  }

  function thumbnailUrl(embedId) {
    var spaceHash = spaceHashFromEmbedId(embedId);
    var embedHash = embedHashFromEmbedId(embedId);
    var endpoint =
      settings.componentsConfig &&
      settings.componentsConfig.cdn &&
      settings.componentsConfig.cdn.endpoint;

    if (!spaceHash || !embedHash || !endpoint) {
      return '';
    }

    return endpoint
      .replace('${this.spaceId}', spaceHash)
      .replace('${spaceId}', spaceHash)
      .replace('{spaceId}', spaceHash)
      .replace(/\/$/, '') + '/' + encodeURIComponent(embedHash) + '/thumbnail.jpg';
  }

  function playerDefaults() {
    return settings.playerDefaults || {};
  }

  function defaultPlayerTheme() {
    return playerDefaults().theme || 'default';
  }

  function defaultPlayerColor() {
    return playerDefaults().color || '';
  }

  function libraryRootCollectionId() {
    return settings.libraryRootCollectionId || '';
  }

  function themeLabel(theme) {
    switch (theme) {
      case 'dolphin':
        return __('Dolphin', 'mave-video');
      case 'synthwave':
        return __('Synthwave', 'mave-video');
      case 'default':
      default:
        return __('Default', 'mave-video');
    }
  }

  function themeOptions() {
    return [
      {
        label: __('Use plugin default', 'mave-video') + ' (' + themeLabel(defaultPlayerTheme()) + ')',
        value: '',
      },
      { label: __('Default', 'mave-video'), value: 'default' },
      { label: __('Dolphin', 'mave-video'), value: 'dolphin' },
      { label: __('Synthwave', 'mave-video'), value: 'synthwave' },
    ];
  }

  function resolvedPlayerTheme(attributes) {
    return attributes.theme || defaultPlayerTheme();
  }

  function resolvedPlayerColor(attributes) {
    return attributes.color || defaultPlayerColor();
  }

  function playerStyle(attributes) {
    var poster = thumbnailUrl(attributes.embedId);
    var style = {
      display: 'block',
      width: '100%',
      aspectRatio: attributes.aspectRatio || '16 / 9',
    };

    if (poster) {
      style.background = 'center / contain no-repeat url(' + poster + ')';
    }

    return style;
  }

  function loadMaveComponents() {
    var src = settings.componentsSrc;

    if (!src) {
      return Promise.resolve();
    }

    window.__maveComponentsConfig = settings.componentsConfig || {};
    loadMaveComponentsInEditorFrames(src);

    if (
      window.customElements &&
      window.customElements.get('mave-player') &&
      window.customElements.get('mave-upload')
    ) {
      return Promise.resolve();
    }

    if (!window.__maveComponentsPromise) {
      window.__maveComponentsPromise = import(src).then(function (module) {
        if (module && typeof module.configureMave === 'function') {
          module.configureMave(settings.componentsConfig || {});
        }

        return module;
      });
    }

    return window.__maveComponentsPromise;
  }

  function loadMaveComponentsInEditorFrames(src) {
    var frames = document.querySelectorAll('iframe');

    Array.prototype.forEach.call(frames, function (frame) {
      var frameWindow;
      var frameDocument;

      try {
        frameWindow = frame.contentWindow;
        frameDocument = frame.contentDocument;
      } catch (error) {
        return;
      }

      if (!frameWindow || !frameDocument || !frameDocument.head) {
        return;
      }

      frameWindow.__maveComponentsConfig = settings.componentsConfig || {};

      if (
        frameWindow.customElements &&
        frameWindow.customElements.get('mave-player') &&
        frameWindow.customElements.get('mave-upload')
      ) {
        return;
      }

      if (frameDocument.getElementById('mave-wordpress-components-loader')) {
        return;
      }

      var script = frameDocument.createElement('script');
      script.id = 'mave-wordpress-components-loader';
      script.type = 'module';
      script.textContent =
        'import(' +
        JSON.stringify(src) +
        ').then(function(module){ if (module && typeof module.configureMave === "function") { module.configureMave(window.__maveComponentsConfig || {}); } }).catch(function(error){ console.error("Failed to load Mave components", error); });';
      frameDocument.head.appendChild(script);
    });
  }

  function playerProps(attributes) {
    var props = {
      embed: attributes.embedId,
      class: 'mave-wordpress-editor-player',
      style: playerStyle(attributes),
    };

    if (attributes.autoplay) {
      props.autoplay = attributes.autoplay;
    }

    if (attributes.loop) {
      props.loop = 'true';
    }

    if (attributes.controls) {
      props.controls = attributes.controls;
    }

    if (attributes.aspectRatio) {
      props['aspect-ratio'] = attributes.aspectRatio;
    }

    if (resolvedPlayerTheme(attributes)) {
      props.theme = resolvedPlayerTheme(attributes);
    }

    if (resolvedPlayerColor(attributes)) {
      props.color = resolvedPlayerColor(attributes);
    }

    return props;
  }

  function MaveNotice(props) {
    if (!props.message) {
      return null;
    }

    return el(
      wp.components.Notice,
      {
        status: props.status || 'info',
        isDismissible: false,
        className: 'mave-wordpress-notice',
      },
      props.message
    );
  }

  function VideoPreview(props) {
    useEffect(function () {
      loadMaveComponents();
    }, []);

    return el(
      'div',
      { className: 'mave-wordpress-preview' },
      el('mave-player', playerProps(props.attributes))
    );
  }

  function LibraryPicker(props) {
    var _useState = useState([]),
      items = _useState[0],
      setItems = _useState[1];
    var _useState2 = useState(true),
      loading = _useState2[0],
      setLoading = _useState2[1];
    var _useState3 = useState(''),
      error = _useState3[0],
      setError = _useState3[1];
    var _useState4 = useState(''),
      query = _useState4[0],
      setQuery = _useState4[1];
    var _useState5 = useState([]),
      collectionPath = _useState5[0],
      setCollectionPath = _useState5[1];
    var _useState6 = useState(1),
      page = _useState6[0],
      setPage = _useState6[1];
    var _useState7 = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasMore: false,
      }),
      pagination = _useState7[0],
      setPagination = _useState7[1];
    var _useState8 = useState([]),
      searchItems = _useState8[0],
      setSearchItems = _useState8[1];
    var _useState9 = useState(false),
      searchLoading = _useState9[0],
      setSearchLoading = _useState9[1];
    var searchRequestRef = useRef(0);

    function currentCollection() {
      return collectionPath.length ? collectionPath[collectionPath.length - 1] : null;
    }

    function currentCollectionId() {
      var collection = currentCollection();

      return collection && collection.id ? collection.id : libraryRootCollectionId();
    }

    function positiveInteger(value, fallback) {
      var parsed = parseInt(value, 10);

      return parsed > 0 ? parsed : fallback;
    }

    function nonNegativeInteger(value, fallback) {
      var parsed = parseInt(value, 10);

      return parsed >= 0 ? parsed : fallback;
    }

    function responseData(response) {
      return response && Array.isArray(response.data) ? response.data : [];
    }

    function videosPath(pageNumber, perPage, collectionId) {
      var path =
        '/videos?show_collections=true&per_page=' +
        encodeURIComponent(perPage) +
        '&page=' +
        encodeURIComponent(pageNumber) +
        '&archived=false';

      if (collectionId) {
        path += '&collection=' + encodeURIComponent(collectionId);
      }

      return path;
    }

    function pickerPath() {
      return videosPath(page, LIBRARY_PER_PAGE, currentCollectionId());
    }

    function fetchLibraryPage(collectionId, pageNumber, perPage) {
      return wp.apiFetch({
        path: restPath(videosPath(pageNumber, perPage, collectionId)),
      });
    }

    function fetchVideos() {
      setLoading(true);
      setError('');

      wp.apiFetch({
        path: restPath(pickerPath()),
      })
        .then(function (response) {
          var data = responseData(response);
          var totalItems = nonNegativeInteger(response.total_items, data.length);
          var totalPages = Math.max(1, nonNegativeInteger(response.total_pages, Math.ceil(totalItems / LIBRARY_PER_PAGE)));

          setItems(data);
          setPagination({
            currentPage: positiveInteger(response.current_page, page),
            totalPages: totalPages,
            totalItems: totalItems,
            hasMore: !!response.has_more,
          });
        })
        .catch(function (apiError) {
          setError(apiError && apiError.message ? apiError.message : __('Could not load Mave videos.', 'mave-video'));
        })
        .finally(function () {
          setLoading(false);
        });
    }

    function fetchAllPages(collectionId) {
      return fetchLibraryPage(collectionId, 1, SEARCH_PER_PAGE).then(function (response) {
        var data = responseData(response);
        var totalItems = nonNegativeInteger(response.total_items, data.length);
        var totalPages = Math.max(1, nonNegativeInteger(response.total_pages, Math.ceil(totalItems / SEARCH_PER_PAGE)));
        var pages = Promise.resolve(data);

        for (var nextPage = 2; nextPage <= totalPages; nextPage += 1) {
          (function (pageNumber) {
            pages = pages.then(function (items) {
              return fetchLibraryPage(collectionId, pageNumber, SEARCH_PER_PAGE).then(function (pageResponse) {
                return items.concat(responseData(pageResponse));
              });
            });
          })(nextPage);
        }

        return pages;
      });
    }

    function fetchAllVideosInCollection(collectionId, visitedCollections) {
      if (collectionId) {
        if (visitedCollections[collectionId]) {
          return Promise.resolve([]);
        }

        visitedCollections[collectionId] = true;
      }

      return fetchAllPages(collectionId).then(function (collectionItems) {
        var videos = collectionItems.filter(isUploadedVideo);
        var collections = collectionItems.filter(isCollection);
        var children = Promise.resolve([]);

        collections.forEach(function (collection) {
          if (!collection.id || visitedCollections[collection.id]) {
            return;
          }

          children = children.then(function (items) {
            return fetchAllVideosInCollection(collection.id, visitedCollections).then(function (childItems) {
              return items.concat(childItems);
            });
          });
        });

        return children.then(function (childItems) {
          return videos.concat(childItems);
        });
      });
    }

    function uniqueItems(items) {
      var seen = {};

      return items.filter(function (item) {
        var id = item && item.id ? item.id : '';

        if (!id || seen[id]) {
          return false;
        }

        seen[id] = true;
        return true;
      });
    }

    function fetchSearchResults(searchQuery, requestId) {
      var needle = searchQuery.toLowerCase();

      setSearchLoading(true);
      setError('');

      fetchAllVideosInCollection(libraryRootCollectionId(), {})
        .then(function (allVideos) {
          if (searchRequestRef.current !== requestId) {
            return;
          }

          setSearchItems(uniqueItems(allVideos).filter(function (item) {
            return itemMatchesQuery(item, needle);
          }));
        })
        .catch(function (apiError) {
          if (searchRequestRef.current !== requestId) {
            return;
          }

          setError(apiError && apiError.message ? apiError.message : __('Could not search Mave videos.', 'mave-video'));
        })
        .finally(function () {
          if (searchRequestRef.current === requestId) {
            setSearchLoading(false);
          }
        });
    }

    useEffect(function () {
      fetchVideos();
    }, [collectionPath, page]);

    useEffect(function () {
      var searchQuery = query.trim();
      var requestId = searchRequestRef.current + 1;

      searchRequestRef.current = requestId;

      if (!searchQuery) {
        setSearchItems([]);
        setSearchLoading(false);
        return;
      }

      var timeout = setTimeout(function () {
        fetchSearchResults(searchQuery, requestId);
      }, 300);

      return function () {
        clearTimeout(timeout);
      };
    }, [query]);

    function isUploadedVideo(item) {
      return (
        'video' === item.object &&
        (item.last_upload || item.poster_image || (Array.isArray(item.renditions) && item.renditions.length))
      );
    }

    function isCollection(item) {
      return 'collection' === item.object;
    }

    function itemMatchesQuery(item, needle) {
      if (!needle) {
        return true;
      }

      return String(item.name || item.id || '').toLowerCase().indexOf(needle) !== -1;
    }

    function collectionsFirst(listItems) {
      var collections = [];
      var videos = [];

      listItems.forEach(function (item) {
        if (isCollection(item)) {
          collections.push(item);
          return;
        }

        videos.push(item);
      });

      return collections.concat(videos);
    }

    var browseItems = useMemo(
      function () {
        return collectionsFirst(items.filter(function (item) {
          if (!isCollection(item) && !isUploadedVideo(item)) {
            return false;
          }

          return true;
        }));
      },
      [items]
    );

    function openCollection(collection) {
      setQuery('');
      setPage(1);
      setCollectionPath(collectionPath.concat([collection]));
    }

    function goUp() {
      setQuery('');
      setPage(1);
      setCollectionPath(collectionPath.slice(0, Math.max(0, collectionPath.length - 1)));
    }

    function itemThumb(item) {
      if (isCollection(item)) {
        return el(
          'span',
          { className: 'mave-wordpress-library-thumb is-collection' },
          wp.components.Dashicon ? el(wp.components.Dashicon, { icon: 'portfolio' }) : null
        );
      }

      return el(
        'span',
        { className: 'mave-wordpress-library-thumb' },
        item.poster_image
          ? el('img', {
              src: item.poster_image,
              alt: '',
              loading: 'lazy',
            })
          : null
      );
    }

    function collectionCountLabel(item) {
      if ('number' !== typeof item.video_count) {
        return __('Collection', 'mave-video');
      }

      return 1 === item.video_count
        ? __('1 video', 'mave-video')
        : item.video_count + ' ' + __('videos', 'mave-video');
    }

    function itemMeta(item) {
      if (isCollection(item)) {
        return el(
          'span',
          { className: 'mave-wordpress-library-meta' },
          el('strong', null, item.name || item.id),
          el('span', null, collectionCountLabel(item))
        );
      }

      return el(
        'span',
        { className: 'mave-wordpress-library-meta' },
        el('strong', null, item.name || item.id),
        el('code', null, item.id)
      );
    }

    var currentPage = pagination.currentPage || page;
    var totalPages = pagination.totalPages || 1;
    var searchQuery = query.trim();
    var isSearching = '' !== searchQuery;
    var visibleItems = isSearching ? searchItems : browseItems;
    var listLoading = isSearching ? searchLoading : loading;
    var hasPreviousPage = currentPage > 1;
    var hasNextPage = totalPages > 1 && (pagination.hasMore || currentPage < totalPages);
    var showPagination = !isSearching && (totalPages > 1 || currentPage > 1);

    function goToPreviousPage() {
      if (hasPreviousPage) {
        setPage(currentPage - 1);
      }
    }

    function goToNextPage() {
      if (hasNextPage) {
        setPage(currentPage + 1);
      }
    }

    return el(
      'div',
      { className: 'mave-wordpress-library' },
      el(MaveNotice, { status: 'error', message: error }),
      el(wp.components.TextControl, {
        __next40pxDefaultSize: true,
        label: __('Search all videos', 'mave-video'),
        value: query,
        onChange: setQuery,
      }),
      el(
        'div',
        { className: 'mave-wordpress-library-actions' },
        el(
          'div',
          { className: 'mave-wordpress-library-actions-main' },
          !isSearching && collectionPath.length
            ? el(
                wp.components.Button,
                { variant: 'secondary', onClick: goUp, disabled: loading },
                __('Back', 'mave-video')
              )
            : null,
          !isSearching && currentCollection()
            ? el(
                'span',
                { className: 'mave-wordpress-library-location' },
                currentCollection().name || currentCollection().id
              )
            : null
        ),
        el(
          wp.components.Button,
          {
            variant: 'secondary',
            onClick: function () {
              if (isSearching) {
                var requestId = searchRequestRef.current + 1;
                searchRequestRef.current = requestId;
                fetchSearchResults(searchQuery, requestId);
                return;
              }

              fetchVideos();
            },
            disabled: listLoading,
          },
          __('Refresh', 'mave-video')
        )
      ),
      listLoading
        ? el(wp.components.Spinner)
        : el(
            'div',
            { className: 'mave-wordpress-library-list' },
            visibleItems.length
              ? visibleItems.map(function (item) {
                  return el(
                    'button',
                    {
                      type: 'button',
                      className: isCollection(item)
                        ? 'mave-wordpress-library-item is-collection'
                        : 'mave-wordpress-library-item',
                      key: item.id,
                      onClick: function () {
                        if (isCollection(item)) {
                          openCollection(item);
                          return;
                        }

                        props.onSelect(item);
                      },
                    },
                    itemThumb(item),
                    itemMeta(item)
                  );
                })
              : el(
                  'p',
                  { className: 'mave-wordpress-library-empty' },
                  isSearching
                    ? __('No matching videos found.', 'mave-video')
                    : __('No videos found.', 'mave-video')
                )
          ),
      showPagination
        ? el(
            'div',
            { className: 'mave-wordpress-library-pagination' },
            el(
              wp.components.Button,
              { variant: 'secondary', onClick: goToPreviousPage, disabled: loading || !hasPreviousPage },
              __('Previous', 'mave-video')
            ),
            el(
              'span',
              { className: 'mave-wordpress-library-pagination-label' },
              sprintf(__('Page %1$d of %2$d', 'mave-video'), currentPage, totalPages)
            ),
            el(
              wp.components.Button,
              { variant: 'secondary', onClick: goToNextPage, disabled: loading || !hasNextPage },
              __('Next', 'mave-video')
            )
          )
        : null
    );
  }

  function LibraryModal(props) {
    return el(
      wp.components.Modal,
      {
        title: __('Choose Mave video', 'mave-video'),
        onRequestClose: props.onClose,
        className: 'mave-wordpress-picker-modal',
      },
      el(LibraryPicker, {
        onSelect: props.onSelect,
      })
    );
  }

  function UploadPanel(props) {
    var uploadRef = useRef(null);
    var fileInputRef = useRef(null);
    var selectedFileRef = useRef(null);
    var _useState = useState(''),
      token = _useState[0],
      setToken = _useState[1];
    var _useState2 = useState(false),
      loading = _useState2[0],
      setLoading = _useState2[1];
    var _useState3 = useState(''),
      error = _useState3[0],
      setError = _useState3[1];
    var _useState4 = useState(''),
      status = _useState4[0],
      setStatus = _useState4[1];
    var _useState5 = useState('info'),
      statusType = _useState5[0],
      setStatusType = _useState5[1];
    var _useState6 = useState(''),
      fileName = _useState6[0],
      setFileName = _useState6[1];
    var _useState7 = useState(0),
      progress = _useState7[0],
      setProgress = _useState7[1];
    var _useState8 = useState('initial'),
      uploadState = _useState8[0],
      setUploadState = _useState8[1];
    var _useState9 = useState(false),
      ready = _useState9[0],
      setReady = _useState9[1];
    var pendingOpenRef = useRef(false);

    function uploadNodeReady() {
      return !!(
        token &&
        uploadRef.current &&
        uploadRef.current.hasAttribute('ready') &&
        typeof uploadRef.current.openFileDialog === 'function'
      );
    }

    function setPendingOpen(value) {
      pendingOpenRef.current = value;

      if (typeof props.onPendingOpenChange === 'function') {
        props.onPendingOpenChange(value);
      }
    }

    function startSelectedFileIfReady() {
      var file = selectedFileRef.current;
      var node = uploadRef.current;

      if (!file || !uploadNodeReady() || !node || typeof node.upload !== 'function') {
        return false;
      }

      if (typeof node.isSupportedFile === 'function' && !node.isSupportedFile(file)) {
        selectedFileRef.current = null;
        setPendingOpen(false);
        setFileName(file.name || '');
        setProgress(0);
        setUploadState('error');
        setStatus('');
        setError(__('This file type is not supported by Mave upload.', 'mave-video'));
        return true;
      }

      selectedFileRef.current = null;
      setPendingOpen(false);
      node.upload(file);
      return true;
    }

    function requestUploadToken(showErrors) {
      var shouldShowErrors = false !== showErrors;

      setLoading(true);

      if (shouldShowErrors) {
        setError('');
      }

      wp.apiFetch({
        path: restPath('/upload-token'),
        method: 'POST',
        data: {},
      })
        .then(function (response) {
          setToken(response.token || '');
          setStatus('');
          setStatusType('info');
          loadMaveComponents();
        })
        .catch(function (apiError) {
          setPendingOpen(false);

          if (shouldShowErrors) {
            setError(apiError && apiError.message ? apiError.message : __('Could not start the Mave upload.', 'mave-video'));
          }
        })
        .finally(function () {
          setLoading(false);
        });
    }

    function openUploadPicker() {
      var waitingForUpload = !uploadNodeReady();

      setError('');
      setStatus('');
      setStatusType('info');
      setPendingOpen(waitingForUpload);

      if (waitingForUpload) {
        window.setTimeout(function () {
          if (!selectedFileRef.current) {
            setPendingOpen(false);
          }
        }, 1500);

        if (!loading && !token) {
          requestUploadToken(true);
        } else {
          loadMaveComponents();
        }

        if (fileInputRef.current && typeof fileInputRef.current.click === 'function') {
          fileInputRef.current.click();
          return true;
        }

        return false;
      }

      setPendingOpen(false);

      if (fileInputRef.current && typeof fileInputRef.current.click === 'function') {
        fileInputRef.current.click();
        return true;
      }

      return true;
    }

    function handleFileInputChange(event) {
      var input = event.target;
      var file = input && input.files && input.files.length ? input.files[0] : null;

      if (input) {
        input.value = '';
      }

      if (!file) {
        setPendingOpen(false);
        return;
      }

      selectedFileRef.current = file;

      if (file.name) {
        setFileName(file.name);
      }

      if (!startSelectedFileIfReady()) {
        setPendingOpen(true);

        if (!loading && !token) {
          requestUploadToken(true);
        } else {
          loadMaveComponents();
        }
      }
    }

    function handleFileInputCancel() {
      if (!selectedFileRef.current) {
        setPendingOpen(false);
      }
    }

    useEffect(function () {
      loadMaveComponents();
      requestUploadToken(false);
    }, []);

    useEffect(function () {
      if (ready) {
        setPendingOpen(false);
      }
    }, [ready]);

    useEffect(function () {
      if (typeof props.registerOpenUpload === 'function') {
        props.registerOpenUpload(openUploadPicker);
      }

      return function () {
        if (typeof props.registerOpenUpload === 'function') {
          props.registerOpenUpload(null);
        }
      };
    }, [token, loading, uploadState, ready]);

    useEffect(function () {
      if (!token || !uploadRef.current) {
        setReady(false);
        return;
      }

      var node = uploadRef.current;
      var disposed = false;
      var observer = null;
      var readyTimer = null;

      function checkReady() {
        var nextReady;

        if (disposed) {
          return;
        }

        nextReady = !!(node.hasAttribute('ready') && typeof node.openFileDialog === 'function');
        setReady(nextReady);

        if (nextReady && selectedFileRef.current) {
          startSelectedFileIfReady();
          return;
        }

        if (nextReady && pendingOpenRef.current) {
          setPendingOpen(false);
        }
      }

      if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(checkReady);
        observer.observe(node, {
          attributes: true,
          attributeFilter: ['ready'],
        });
      }

      node.addEventListener('statechange', checkReady);
      checkReady();

      if (window.customElements && typeof window.customElements.whenDefined === 'function') {
        window.customElements.whenDefined('mave-upload').then(checkReady);
      }

      if (node.updateComplete && typeof node.updateComplete.then === 'function') {
        node.updateComplete.then(checkReady);
      }

      readyTimer = window.setTimeout(checkReady, 100);

      return function () {
        disposed = true;
        node.removeEventListener('statechange', checkReady);

        if (observer) {
          observer.disconnect();
        }

        if (readyTimer) {
          window.clearTimeout(readyTimer);
        }
      };
    }, [token]);

    useEffect(function () {
      if (!token || !uploadRef.current) {
        return;
      }

      var node = uploadRef.current;

      function handleUpload(event) {
        var file = event.detail && event.detail.file ? event.detail.file : null;

        if (file && file.name) {
          setFileName(file.name);
        }

        setPendingOpen(false);
        setError('');
        setProgress(1);
        setUploadState('uploading');
        setStatusType('info');
        setStatus(file && file.name ? __('Uploading file to Mave...', 'mave-video') : __('Uploading...', 'mave-video'));
      }

      function setClampedProgress(value) {
        setProgress(Math.max(0, Math.min(100, value)));
      }

      function handleStateChange(event) {
        var detail = event.detail || {};

        if (typeof detail.progress === 'number') {
          setClampedProgress(detail.progress);
        }

        if (detail.state) {
          setUploadState(detail.state);
        }

        if ('uploading' === detail.state) {
          setStatusType('info');
          setStatus(__('Uploading file to Mave...', 'mave-video'));
        }

        if ('processing' === detail.state) {
          setStatusType('info');
          setStatus(__('Upload received. Mave is processing it...', 'mave-video'));
        }

        if ('error' === detail.state && detail.error) {
          setStatus('');
          setError(detail.error.message || __('Upload failed.', 'mave-video'));
        }
      }

      function handleProgress(event) {
        var detail = event.detail || {};

        if (typeof detail.progress === 'number') {
          setClampedProgress(detail.progress);
        }

        setUploadState('uploading');
        setStatusType('info');
        setStatus(__('Uploading file to Mave...', 'mave-video'));
      }

      function handleProcessing() {
        setProgress(100);
        setUploadState('processing');
        setStatusType('info');
        setStatus(__('Upload received. Mave is processing it...', 'mave-video'));
      }

      function finishCompletedUpload(embed) {
        props.setAttributes({
          embedId: embed,
          videoName: fileName || __('Uploaded video', 'mave-video'),
          posterImage: '',
        });
        clearCompletedUpload();
      }

      function clearCompletedUpload() {
        setProgress(0);
        setUploadState('initial');
        setStatus('');
        setStatusType('info');
        setFileName('');

        if (typeof node.reset === 'function') {
          node.reset();
        }
      }

      function handleCompleted(event) {
        var embed = event.detail && event.detail.embed ? event.detail.embed : '';

        if (!embed) {
          setStatusType('info');
          setStatus(__('Upload complete, waiting for Mave to return the embed id.', 'mave-video'));
          return;
        }

        setProgress(100);
        setUploadState('done');
        setStatusType('info');
        setStatus(__('Upload complete. Loading preview...', 'mave-video'));
        finishCompletedUpload(embed);
      }

      function handleFailed(event) {
        var detail = event.detail || {};
        setProgress(0);
        setUploadState('error');
        setPendingOpen(false);
        setStatus('');
        setError(detail.message || __('Upload failed.', 'mave-video'));
      }

      function handleInvalid(event) {
        var detail = event.detail || {};
        var file = detail.file || null;

        if (file && file.name) {
          setFileName(file.name);
        }

        setProgress(0);
        setUploadState('error');
        setPendingOpen(false);
        setStatus('');
        setError(detail.message || __('This file type is not supported by Mave upload.', 'mave-video'));
      }

      function handleRegistryError(event) {
        var detail = event.detail || {};
        setProgress(0);
        setUploadState('error');
        setPendingOpen(false);
        setStatus('');
        setError(detail.message || __('Mave could not prepare the upload.', 'mave-video'));
      }

      node.addEventListener('upload', handleUpload);
      node.addEventListener('statechange', handleStateChange);
      node.addEventListener('progress', handleProgress);
      node.addEventListener('processing', handleProcessing);
      node.addEventListener('completed', handleCompleted);
      node.addEventListener('failed', handleFailed);
      node.addEventListener('invalid', handleInvalid);
      node.addEventListener('error', handleRegistryError);

      return function () {
        node.removeEventListener('upload', handleUpload);
        node.removeEventListener('statechange', handleStateChange);
        node.removeEventListener('progress', handleProgress);
        node.removeEventListener('processing', handleProcessing);
        node.removeEventListener('completed', handleCompleted);
        node.removeEventListener('failed', handleFailed);
        node.removeEventListener('invalid', handleInvalid);
        node.removeEventListener('error', handleRegistryError);
      };
    }, [token, fileName]);

    var hasActivity = error || status || progress > 0;
    var panelClass = hasActivity ? 'mave-wordpress-upload-panel' : 'mave-wordpress-upload-panel is-idle';

    return el(
      'div',
      { className: panelClass },
      el('input', {
        ref: fileInputRef,
        type: 'file',
        accept: 'video/*, audio/*',
        className: 'mave-wordpress-native-file-input',
        onChange: handleFileInputChange,
        onCancel: handleFileInputCancel,
      }),
      token ? el('mave-upload', { class: 'mave-wordpress-upload-driver', token: token, ref: uploadRef }) : null,
      el(MaveNotice, { status: 'error', message: error }),
      el(MaveNotice, { status: statusType, message: status }),
      hasActivity && !error
        ? el(
            'div',
            { className: 'mave-wordpress-upload-status' },
            loading ? el(wp.components.Spinner) : null,
            progress > 0
              ? el(
                  'div',
                  {
                    className: 'mave-wordpress-upload-progress',
                    role: 'progressbar',
                    'aria-valuemin': '0',
                    'aria-valuemax': '100',
                    'aria-valuenow': String(progress),
                  },
                  el('span', { style: { width: progress + '%' } })
                )
              : null,
            progress > 0 ? el('span', { className: 'mave-wordpress-upload-progress-label' }, progress + '%') : null
          )
        : null,
      error
        ? el(
            wp.components.Button,
            { variant: 'secondary', onClick: requestUploadToken, disabled: loading },
            __('Retry upload setup', 'mave-video')
          )
        : null
    );
  }

  function Edit(props) {
    var attributes = props.attributes;
    var setAttributes = props.setAttributes;
    var _useState = useState(''),
      mode = _useState[0],
      setMode = _useState[1];
    var _useState2 = useState(false),
      uploadPending = _useState2[0],
      setUploadPending = _useState2[1];
    var uploadOpenerRef = useRef(null);

    var blockProps = wp.blockEditor.useBlockProps({
      className: attributes.embedId ? 'has-mave-video' : 'is-mave-empty',
    });

    function selectVideo(video) {
      setMode('');
      setAttributes({
        embedId: video.id,
        videoName: video.name || video.id,
        posterImage: video.poster_image || '',
      });
    }

    function registerOpenUpload(callback) {
      uploadOpenerRef.current = callback;
    }

    function openMaveUpload() {
      setMode('upload');

      if (typeof uploadOpenerRef.current === 'function') {
        uploadOpenerRef.current();
      }
    }

    function uploadButtonContent() {
      if (!uploadPending) {
        return __('Upload', 'mave-video');
      }

      return [
        el(wp.components.Spinner, { key: 'spinner' }),
        el('span', { key: 'label' }, __('Upload', 'mave-video')),
      ];
    }

    function toolbarUploadIcon() {
      if (!uploadPending) {
        return 'upload';
      }

      return el(
        'span',
        { className: 'mave-wordpress-toolbar-spinner' },
        el(wp.components.Spinner)
      );
    }

    var settingsLink = settings.settingsUrl
      ? el(
          'a',
          {
            href: settings.settingsUrl,
            target: '_blank',
            rel: 'noreferrer',
          },
          __('Open Mave settings', 'mave-video')
        )
      : null;

    return el(
      'div',
      blockProps,
      el(
        wp.blockEditor.InspectorControls,
        null,
        el(
          wp.components.PanelBody,
          { title: __('Mave video', 'mave-video'), initialOpen: true },
          el(wp.components.TextControl, {
            __next40pxDefaultSize: true,
            label: __('Embed id', 'mave-video'),
            value: attributes.embedId,
            onChange: function (value) {
              setAttributes({ embedId: value });
            },
          }),
          el(wp.components.SelectControl, {
            __next40pxDefaultSize: true,
            label: __('Autoplay', 'mave-video'),
            value: attributes.autoplay,
            options: [
              { label: __('Off', 'mave-video'), value: '' },
              { label: __('Lazy', 'mave-video'), value: 'lazy' },
              { label: __('Always', 'mave-video'), value: 'always' },
            ],
            onChange: function (value) {
              setAttributes({ autoplay: value });
            },
          }),
          el(wp.components.ToggleControl, {
            label: __('Loop', 'mave-video'),
            checked: !!attributes.loop,
            onChange: function (value) {
              setAttributes({ loop: value });
            },
          }),
          el(wp.components.TextControl, {
            __next40pxDefaultSize: true,
            label: __('Controls', 'mave-video'),
            help: __('Leave empty for the Mave default controls.', 'mave-video'),
            value: attributes.controls,
            onChange: function (value) {
              setAttributes({ controls: value });
            },
          }),
          el(wp.components.TextControl, {
            __next40pxDefaultSize: true,
            label: __('Aspect ratio', 'mave-video'),
            help: __('Example: 16 / 9', 'mave-video'),
            value: attributes.aspectRatio,
            onChange: function (value) {
              setAttributes({ aspectRatio: value });
            },
          }),
          el(wp.components.SelectControl, {
            __next40pxDefaultSize: true,
            label: __('Theme', 'mave-video'),
            value: attributes.theme || '',
            options: themeOptions(),
            onChange: function (value) {
              setAttributes({ theme: value });
            },
          }),
          el(wp.components.TextControl, {
            __next40pxDefaultSize: true,
            label: __('Color', 'mave-video'),
            help: defaultPlayerColor()
              ? __('Leave empty to use plugin default:', 'mave-video') + ' ' + defaultPlayerColor()
              : __('Leave empty for the Mave default color.', 'mave-video'),
            placeholder: defaultPlayerColor() || '#1997FF',
            value: attributes.color || '',
            onChange: function (value) {
              setAttributes({ color: value });
            },
          })
        )
      ),
      el(
        wp.blockEditor.BlockControls,
        null,
        el(
          wp.components.ToolbarGroup,
          null,
          el(wp.components.ToolbarButton, {
            icon: 'format-video',
            label: __('Choose Mave video', 'mave-video'),
            onClick: function () {
              setMode('library');
            },
          }),
          el(wp.components.ToolbarButton, {
            icon: toolbarUploadIcon(),
            label: __('Upload to Mave', 'mave-video'),
            disabled: uploadPending,
            onClick: openMaveUpload,
          })
        )
      ),
      !settings.hasApiKey
        ? el(
            wp.components.Placeholder,
            {
              icon: 'video-alt3',
              label: __('Mave Video', 'mave-video'),
            },
            el('p', null, __('Configure a Mave API key before choosing or uploading videos.', 'mave-video')),
            settingsLink
          )
        : el(
            'div',
            { className: 'mave-wordpress-editor-shell' },
            attributes.embedId
              ? el(
                  'div',
                  null,
                  el(VideoPreview, { attributes: attributes })
                )
              : el(
                  wp.components.Placeholder,
                  {
                    icon: 'video-alt3',
                    label: __('Mave Video', 'mave-video'),
                  },
                  el('p', null, __('Choose an existing Mave video or upload a new one.', 'mave-video')),
                  el(
                    'div',
                    { className: 'mave-wordpress-placeholder-actions' },
                    el(
                      wp.components.Button,
                      { variant: 'primary', onClick: function () { setMode('library'); } },
                      __('Choose video', 'mave-video')
                    ),
                    el(
                      wp.components.Button,
                      {
                        variant: 'secondary',
                        onClick: openMaveUpload,
                        disabled: uploadPending,
                        className: uploadPending ? 'mave-wordpress-upload-button is-loading' : 'mave-wordpress-upload-button',
                      },
                      uploadButtonContent()
                    )
                  )
                ),
            el(UploadPanel, {
              setAttributes: setAttributes,
              registerOpenUpload: registerOpenUpload,
              onPendingOpenChange: setUploadPending,
            }),
            mode === 'library'
              ? el(LibraryModal, {
                  onSelect: selectVideo,
                  onClose: function () {
                    setMode('');
                  },
                })
              : null
          )
    );
  }

  wp.blocks.registerBlockType('mave/video', {
    title: __('Mave Video', 'mave-video'),
    description: __('Select or upload a video from Mave.', 'mave-video'),
    category: 'media',
    icon: 'video-alt3',
    attributes: {
      embedId: { type: 'string', default: '' },
      videoName: { type: 'string', default: '' },
      posterImage: { type: 'string', default: '' },
      autoplay: { type: 'string', default: '' },
      loop: { type: 'boolean', default: false },
      controls: { type: 'string', default: '' },
      aspectRatio: { type: 'string', default: '' },
      theme: { type: 'string', default: '' },
      color: { type: 'string', default: '' },
    },
    supports: {
      align: ['wide', 'full'],
      html: false,
    },
    edit: Edit,
    save: function () {
      return null;
    },
  });
})(window.wp);
