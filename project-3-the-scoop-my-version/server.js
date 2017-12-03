var   writeYamlFile = require("write-yaml-file");
const loadYamlFile  = require('load-yaml-file');
const fs            = require('fs');

// for this to work you have to:
// npm install --save load-yaml-file
// npm install --save write-yaml-file

// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  comments: {},
  nextArticleId: 1,
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  },
};

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

// FH upvote Comment object
function upvoteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    savedComment = upvote(savedComment, username);

    response.body = {comment: savedComment};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
} // FH end upvoteComment

// FH downvote Comment object
function downvoteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    savedComment = downvote(savedComment, username);
    response.body = {comment: savedComment};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
} // FH end downvoteComment

// FH create new comment object
function createComment(url, request) {
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (requestComment && requestComment.body &&
      requestComment.username && database.users[requestComment.username] &&
      requestComment.articleId && database.articles[requestComment.articleId]) {
    const comment = {
      id: database.nextCommentId++,
      body: requestComment.body,
      username: requestComment.username,
      articleId: requestComment.articleId,
      upvotedBy: [],
      downvotedBy: []
    };

    database.comments[comment.id] = comment;
    database.users[comment.username].commentIds.push(comment.id);
    database.articles[comment.articleId].commentIds.push(comment.id);

    response.body = {comment: comment};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
} // FH end createComment

// FH update comment object
function updateComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedComment = database.comments[id];
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (!id || !requestComment) {
    response.status = 400;
  } else if (!savedComment) {
    response.status = 404;
  } else {
    savedComment.body  = requestComment.body  || savedComment.body ;
    database.comments[id].body = savedComment.body;

    response.body = {comment: savedComment};
    response.status = 200;
  }

  return response;
} // end updateComment

/////////////////

// users:
//   { 'user1@gmail.com':
//      { username: 'user1@gmail.com',
//        articleIds: [Object],
//        commentIds: [Object]
//      },
//   }

//  articles:
//   {'5':
//      { id: 5,
//        title: 'article by user1',
//        url: 'www.user1.article.parool.nl',
//        username: 'user1@gmail.com',
//        commentIds: [Object],
//        upvotedBy: [],
//        downvotedBy: [],
//        comments: [Object]
//      }
//   },

//  comments:
//   { '1':
//      { id: 1,
//        body: 'First comment from user2 on user1's  article by user1',
//        username: 'user2@gmail.com',
//        articleId: 5,
//        upvotedBy: [],
//        downvotedBy: []
//      }
//   },

// FH Delete comment object
function deleteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedComment = database.comments[id];
  const response = {};

  if (savedComment) {
    database.comments[id] = null;
    const userCommentIds = database.users[savedComment.username].commentIds;
    userCommentIds.splice(userCommentIds.indexOf(id), 1);
    const articleCommentIds = database.articles[savedComment.articleId].commentIds;
    articleCommentIds.splice(articleCommentIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 404;
  }

  return response;
} // FH end deleteComment

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

//var isFilePresent = new Promise(
//  function (resolve, reject) {
//    // first check if the file exists before opening it ! this does not work because JavaScript DOES NOT WAIT ON ANYBODY !!!
//    var fileName = 'SavedScoops.yaml';
//
//    console.log(fileName);
//
//    fs.stat(fileName, function(err, stat) {
//      if(err == null) {
//        // All is well
//        resolve('All is well');
//      } else if(err.code == 'ENOENT') {
//        // file does not exist
//        reject(fileName+' cannot be found, we will start fresh');
//      } else {
//        reject(fileName+' cannot be opened, errorcode: '+err.code);
//      }
//    })
//  }
//)

// FH load database object from existing YAML file using loadYamlFile
// Could not get the check for the YAML file to exists working because the concept of "JavaScript not waiting for anybody" is alien to me.
// But it was not part of the Scoop project ...
function loadDatabase() {
//  isFilePresent
//    .then( message => {
//      console.log('loading data '+message);
      var data=loadYamlFile.sync('SavedScoops.yaml');
      console.log(data);
      return(data);
//    })
//    .catch( error => {
//      console.log(error.message)
//    })
} // FH end loadDatabase

// FH save Database object ito YAML file using writeYamlFile
function saveDatabase() {
  writeYamlFile('SavedScoops.yaml', database)                    // this is a promise
    .then( () => {
       console.log('writen changes to SavedScoops.yaml')
    })
    .catch( function(e) {
       console.log('SavedScoops.yaml cannot be written to !');   // "oh, no!"
    })
} // FH end saveDatabase

// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', null);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
    console.log('key in database = '+key);
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});
