# Getting Started

This nodejs codebase was inspired by some tweets from [@100TrillionUSD](https://twitter.com/100trillionUSD/status/1081217034485149697) about a weird pattern in the nonce vs block height visualization. Check out the thread to see what others are saying on the topic. Also there's a dope reddit thread on the topic sparked by [u/NekoNormalan](https://www.reddit.com/r/Bitcoin/comments/adddja/the_weird_nonce_pattern/).

![Nonce Visualization](nonce.png)
## Gathering all required dependencies

`npm install`

One of the dependencies is plotly.js which requires authenticated access to produce the graphs. So you are gonnna have to create an like they recommend on their [site](https://plot.ly/nodejs/getting-started/). 

I hope to get ride of this dependecy once I figure out how to use d3.js properly. 

## Configuration values

I'm using config to specify things like the RPC server, blocks to sync/index in a go and plotly credentials. You can update the values in `config/default.json` or just create a copy named `development.json` or `production.json` to match your `NODE_ENV` so that you don't commit any senstive credentials. 

# Running the things

## Syncing or Indexing blocks
The visualization is of the Bitcoin blockchain. So run the following command to get a few blocks to visualize.

`node persist-blocks.js`

This will start index the blockchain from the newest block to the oldest.

## Visualizing

The nonce.png is created by running the following command

`node nonce-to-height-scatter-plot.js`

# TODO

There's a few things that could be done to make this codebase better or easier to use. Here are a few of them.
* Use d3.js instead of plotly.js to produce the visualization.
* Export an html of an interactive version of the visualization.
* Write a few more scripts for other visualizations.
* Sync and index the coinbase transaction and make visulizations.