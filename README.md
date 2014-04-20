This is library for transferring all media embeded in Typepad blog to Flickr account.
It downloads everything (images, embedded videos, youtube linked videos) locally and then transfers
them to Flicker photostream maintaining proper order, titles and taken dates.

## This is pre-alpha software made for personal usage. So, be carefull using it


## Installation

Download it locally and run:

```npm install```

## Configuration

After that edit ```config.json``` (you can leave `permissions` and `defaultDir` as is):
```
{
    "blog":"BLOG ID FROM TYPEPAD",
    "api_key":"API KEY FROM FLICKR - LOOK FOR IT https://www.flickr.com/services/api/",
    "secret":"SECRET KEY FOR FLICKR API - LOOK FOR IT https://www.flickr.com/services/api/",
    "permissions":"delete",
    "defaultDir":"./downloads/"
}
```

Run ```node login.js```

You will be prompted for code which will be shown in browser.
The default browser will automatically run with a page allowing to authorize your application to access Flickr.
When you accept it, the number code e.g `534-12-678` will be shown - copy this code and paste it to application prompt.

The `User Id`, `Access Token` and `Access Token Secret` will be saved in ```config.json``` for next usage.

## Run

After that you can run ```node typepad.js``` and watch the whole process logging in command prompt.

If it encounters problems downloading or uploading files they will be saved in `blog.json` log file.

You can run `node typepad.js` again - it will download and upload only problem files.


## Known issues
Due to `issue` in flickr-with-uploads you will not see error message returned from Flicker (pull-request waiting)