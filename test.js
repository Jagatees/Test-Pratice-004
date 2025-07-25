const expression = 'console.log("bad")';
eval(expression);
eval("console.log('this is unsafe')");

eval(expression);
eval("console.log('this is unsafe')");



