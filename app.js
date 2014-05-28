var Express = require('express');
var Sequelize = require('sequelize');

var assert = require('assert');

var app = Express();
//configuration for database connection
var Sequelize = require('sequelize')
, sequelize = new Sequelize('your_database_name_here', 'username', 'password', {
  dialect:"mariadb", // or 'mysql','sqlite', 'postgres'
  port:3306
});

//check if connection works
sequelize
.authenticate()
.complete(function(err) {
  if (!!err) {
    console.log('Unable to connect to the database:', err);
    process.exit(1);
  } else {
    console.log('Connection to db has been established successfully.');
  }
});

//db model
var Ad = sequelize.define('Ad', {
  ad_id:{
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoincrement: true
  },
  date:Sequelize.DATE,
  impressions:Sequelize.BIGINT,
  clicks:Sequelize.BIGINT,
  spent:Sequelize.BIGINT
});

var Action = sequelize.define('Action', {
  date:Sequelize.DATE,
  action:Sequelize.STRING,
  count:Sequelize.BIGINT,
  value:Sequelize.BIGINT
});

Ad.hasMany(Action);
Action.belongsTo(Ad);

//Create modeled schema for database
sequelize
.sync({ force: true })
.complete(function(err) {
  if (!!err) {
    console.log('An error occurred while creating the table:', err);
    process.exit(1);
  } else {
    console.log('Database synced!');
    //add dummy data for testing
    Ad.create({date:'10-10-2012', impressions:10, clicks:100, spent:500}).complete(function(err, src){
      Action.create({date:'10-10-2012', action:'mobileapp_install', count:10, value:34}).complete(function(err, target){
        src.addAction(target);
      });
      Action.create({date:'11-10-2012', action:'page_like', count:4, value:0, cpa:412}).complete(function(err, target){
        src.addAction(target);
      });
    });
  }
});

function isValidDate(strDate) {
  if (strDate.length !== 10) {
    return false;
  }
  var dateParts = strDate.split("-");
  var date = new Date(dateParts[0], dateParts[1], dateParts[2]);
  if ( Object.prototype.toString.call(date) === "[object Date]" ) {
    if ( isNaN( date.getTime() ) ) {
      return false;
    }
    return true;
  }
  return false;
}

app.get('/', function(req, res){
  res.send('Specs told me to serve from /api/stats');
});

//GET /api/stats?ad_ids=1,2,3&start_time=2013-09-01&end_time=2013-10-01
app.get('/api/stats', function(req, res) {
  var adIds = req.param('ad_ids').split(","),
  startString = req.param('start_time'),
  endString = req.param('end_time');

  //check params
  assert(typeof startString === 'string' && isValidDate(startString), 'Start_time needs to be in YYYY-MM-DD date format.');
  assert(typeof endString === 'string' && isValidDate(endString), 'End_time needs to be in YYYY-MM-DD date format.');

  var searchJSON = {where:{ad_id:adIds, date:{between:[startString,endString]}},include:[Action]};

  Ad.findAll(searchJSON).success(
             function(ads){
               var result = {}, i;
               for(i=0; i<ads.length; i++){
                result[ads[i].ad_id] = ads[i];
               }
               res.contentType('application/json');
               res.json(result);
             });
});

app.listen(3000);
