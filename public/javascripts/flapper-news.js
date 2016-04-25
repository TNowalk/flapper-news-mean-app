angular.module('flapperNews', ['ui.router']);

angular
  .module('flapperNews')
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      $stateProvider
        .state('home', {
          url: '/home',
          templateUrl: '/partials/home.html',
          controller: 'MainCtrl',
          resolve: {
            postPromise: ['Post', function(Post){
              return Post.getAll();
            }]
          }
        })
        .state('post', {
          url: '/posts/{id}',
          templateUrl: '/partials/post.html',
          controller: 'PostCtrl',
          resolve: {
            post: ['$stateParams', 'Post', function($stateParams, Post) {
              return Post.get($stateParams.id);
            }]
          }
        })
        .state('login', {
          url: '/login',
          templateUrl: '/partials/login.html',
          controller: 'AuthCtrl',
          onEnter: ['$state', 'auth', function($state, auth){
            if(auth.isLoggedIn()){
              $state.go('home');
            }
          }]
        })
        .state('register', {
          url: '/register',
          templateUrl: '/partials/register.html',
          controller: 'AuthCtrl',
          onEnter: ['$state', 'auth', function($state, auth){
            if(auth.isLoggedIn()){
              $state.go('home');
            }
          }]
        });

      $urlRouterProvider.otherwise('home');
    }
  ]);

angular
  .module('flapperNews')
  .factory('auth', [
    '$http',
    '$window',
    function($http, $window) {
      var auth = {
        saveToken: function(token) {
          $window.localStorage['flapper-news-token'] = token;
        },
        getToken: function() {
          return $window.localStorage['flapper-news-token'];
        },
        isLoggedIn: function(){
          var token = auth.getToken();

          if(token){
            var payload = JSON.parse($window.atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
          } else {
            return false;
          }
        },
        currentUser: function(){
          if(auth.isLoggedIn()){
            var token = auth.getToken();
            var payload = JSON.parse($window.atob(token.split('.')[1]));
            return payload.username;
          }
        },
        register: function(user){
          return $http.post('/register', user).success(function(data){
            auth.saveToken(data.token);
          });
        },
        logIn: function(user){
          return $http.post('/login', user).success(function(data){
            auth.saveToken(data.token);
          });
        },
        logOut: function(){
          $window.localStorage.removeItem('flapper-news-token');
        }
      };

      return auth;
    }
  ]);

angular
  .module('flapperNews')
  .factory('Post', [
    '$http',
    'auth',
    function($http, auth) {
      var p = {
        posts: [],
        get: function(id) {
          return $http.get('/posts/' + id).then(function(res){
            return res.data;
          });
        },
        getAll: function() {
          return $http.get('/posts').success(function(data){
            angular.copy(data, p.posts);
          });
        },
        create: function(post) {
          return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
          }).success(function(data){
            p.posts.push(data);
          });
        },
        upvote: function(post) {
          return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
          }).success(function(data){
            post.upvotes += 1;
          });
        },
        addComment: function(id, comment) {
          return $http.post('/posts/' + id + '/comments', comment, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
          });
        },
        upvoteComment: function(post, comment) {
          return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
            headers: {Authorization: 'Bearer '+auth.getToken()}
          }).success(function(data){
            comment.upvotes += 1;
          });
        }
      };

      return p;
    }
  ]);

angular
  .module('flapperNews')
  .controller('AuthCtrl', [
    '$scope',
    '$state',
    'auth',
    function($scope, $state, auth) {
      $scope.user = {};

      $scope.register = function(){
        auth.register($scope.user).error(function(error){
          $scope.error = error;
        }).then(function(){
          $state.go('home');
        });
      };

      $scope.logIn = function(){
        auth.logIn($scope.user).error(function(error){
          $scope.error = error;
        }).then(function(){
          $state.go('home');
        });
      };
    }
  ]);

angular
  .module('flapperNews')
  .controller('NavCtrl', [
    '$scope',
    'auth',
    function($scope, auth) {
      $scope.isLoggedIn = auth.isLoggedIn;
      $scope.currentUser = auth.currentUser;
      $scope.logOut = auth.logOut;
    }
  ]);

angular
  .module('flapperNews')
  .controller('MainCtrl', [
    '$scope',
    'auth',
    'Post',
    function($scope, auth, Post) {
      $scope.isLoggedIn = auth.isLoggedIn;

      $scope.posts = Post.posts;

      $scope.addPost = function() {
        if (!$scope.title || $scope.title === '') {
          return;
        }

        Post.create({
          title: $scope.title,
          link: $scope.link,
        });

        $scope.title = '';
        $scope.link  = '';
      };

      $scope.incrementUpvotes = function(post) {
        Post.upvote(post);
      };
    }
  ]);

angular
  .module('flapperNews')
  .controller('PostCtrl', [
    '$scope',
    'auth',
    'Post',
    'post',
    function($scope, auth, Post, post) {
      $scope.isLoggedIn = auth.isLoggedIn;
      
      $scope.post = post;

      $scope.addComment = function(){
        if($scope.body === '') {
          return;
        }

        Post.addComment(post._id, {
          body: $scope.body,
          author: 'user',
        }).success(function(comment) {
          $scope.post.comments.push(comment);
        });

        $scope.body = '';
      };

      $scope.incrementUpvotes = function(comment){
        Post.upvoteComment(post, comment);
      };
    }
  ]);
