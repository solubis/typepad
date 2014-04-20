require('colors');

function timestamp() {
  var t = new Date();

  return '[' + t.getHours() + ':' + t.getMinutes() + ' ' + t.getSeconds() + ':' + t.getMilliseconds() + ']';
}

function log(message, type, error) {
  var color,
      tag;

  if (message instanceof Error) {
    error = message;
    message = ' ';
  }

  if (message instanceof Array) {
    message = message.join();
  }

  switch (type) {
    case 1:
      color = 'green';
      tag = 'DEBUG ';
      break;
    case 2:
      color = 'yellow';
      tag = 'WARN  ';
      break;
    case 3:
      color = 'red';
      tag = 'ERROR '
      break;
    default:
      color = 'white';
      tag = 'INFO  ';
  }

  if (!message) {
    message = 'Undefined';
  }

  if (error) {
    message = message.yellow;
  } else {
    message = message[color];
  }

  console.log(timestamp() + ' ' + tag.bold[color] + ': ' + (error ? error.message.red + ' ' : '') + message);

  if (error instanceof Error) {
    console.log(error.stack);
  }
}


module.exports = {
  info: function (message) {
    log(message, 0)
  },
  debug: function (message) {
    log(message, 1)
  },
  warn: function (message) {
    log(message, 2)
  },
  error: function (message, error) {
    log(message, 3, error)
  }
}