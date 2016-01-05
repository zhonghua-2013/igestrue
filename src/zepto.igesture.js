/**
     * @author wangzhonghua
     * @constructor
     * @alias $.iGesture
     * @desc 智能版手势操作组件
     * @param {Object} options 配置项
     * @param {String|Object} options.container 滑动元素的父容器(必须)
     * @param {String|Object} options.selector 需要滑动的元素(必须)
     * @param {Object} options.wrap 可选的最外父容器，目的是可支持多滚动区域
     * @param {Boolean} options.hScroll 是否指定水平滚动,指定后，即使内容宽度小于容器宽度，也会左右划动,默认值false，否则自动根据父容器与滑动元素的宽度、高度判断滚动方向
     * @param {Boolean} options.vScroll 是否指定垂直滚动,指定后，即使内容高度小于容器高度，也会上下划动,默认值false
     * @param {Boolean} options.momentum 惯性，默认值true
     * @param {Boolean} options.bounce 是否回弹,默认值true
     * @param {Number} options.bounceMaxX x轴回弹长度
     * @param {Number} options.bounceMaxY y轴回弹长度
     * @param {Number} options.speedScale 阻尼
     * @param {Boolean} options.zoomed 是否使用手势缩放
     * @param {Boolean} options.vAutoScrollOutIn 是否允许竖直方向上局部区域与外部区域自动滚动切换
     * @param {Boolean} options.useTransition 使用transition动画
     * @param {Boolean} options.isDispatchClick 是否动态创建click事件派发
     * @param {Boolean} options.isForceUse2d 是否强制使用2d渲染，在某些浏览器上3d渲染存在bug，尽管支持
     * @param {Boolean} options.snap 是否使用移动阈值判断移动趋势，目前只支持x方向
     * @param {Number} options.snapThreshold 使用阈值判断移动时的调整距离
     * @param {Function} options.onScroll 滚动过程中响应事件，包括正常手指同步滚动以及惯性过程中的实时滚动
     * @param {Function} options.onTouchStart 防止低性能android易触发页面滚动
     * @param {Function} options.onTouchMoveStart 响应touchmove事件
     * @param {Function} options.onTouchMoveEnd
     * @param {Function} options.onTouchEnd 响应touchend事件
     * @param {Function} options.onGestureStart 设置允许手势缩放(zoomed)时才会用到
     * @param {Function} options.onGestureChange 允许手势缩放时才会用到
     * @param {Function} options.onGestureEnd 允许手势缩放时才会用到
     * @param {Function} options.onTransitionEnd 设置允许使用transition(useTransition)动画时才会用到
     * @param {Function} options.onBounceEnd
     * @param {Function} options.onMomentumStart
     * @param {Function} options.onScrollEnd
     * @param {Function} options.onSnapStart
     * @param {Function} options.onSnapUpdateEnd
     * @param {Function} options.onSnapBounceEnd
     * @example
     * new $.iGesture({
     *      container:'.test_container',		//string|$obj   must
     *      selector:'.test_selector',          //string|$obj   must
     *      wrap:$('.test_wrap'),				//optional  可选的最外父容器，目的是可支持多滚动区
     *      zoomed:true,                       //是否绑定缩放手势事件，默认true
     *      hScroll: false,						//是否指定水平滚动
     *      vScroll: false,						//是否指定垂直滚动
     *      momentum:true,						//惯性
     *      bounce:true,						//回弹
     *      speedScale:1,						//阻尼系数
     *      vAutoScrollOutIn:true,				//是否允许竖直方向上局部区域与外部区域自动滚动切换
     *      onTouchStart:function(e){}
     * })
     * getData(key);                            //return data of key
     * setData(key,value);                      //set data.key=value 
     * getBaseData(key);                        //return base of key
     * setBaseData(key,value);               	//set base.key=value 
     * enableTouch()                            //enable touch
     * disableTouch()                           //disable touch
     * enableGesture()                          //enable gesture
     * disableGesture()                         //disable gesture
     * resetData($scroller)                     // reset dom state
     * render($scroller,scale,left,top)         //render dom base on scale、left and top
     * fixPosition($scroller)                   //fix dom position 
     */
    
;(function($){ 
	var EV_TOUCHSTART ='touchstart',
        EV_TOUCHMOVE = 'touchmove',
        EV_TOUCHEND = 'touchend',
        EV_TOUCHCANCEL='touchcancel',
        EV_GESTURESTART ='gesturestart',
        EV_GESTURECHANGE = 'gesturechange',
        EV_GESTUREEND = 'gestureend',
        EV_TRANSEND = 'webkitTransitionEnd';

	var	m = Math,
		support3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),
		nextFrame = (function() {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                function(callback) { return setTimeout(callback, 17); };
        })(),
		cancelFrame = (function () {
            return window.cancelRequestAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                clearTimeout;
        })();
    var momentumTime = 300, //惯性的最大触发时间间隔
    	snapTime = 250,//snap的最大触发时间间隔
    	snapTriggerRatio = 0.1,//snap的最小触发距离
    	doubleClickTime = 350;//避免连击的最小时间间隔
    
	var iGesture = function(options){			
		this._options = {
			container: null,
			selector: null,
			wrap: null,
			hScroll: false,//是否指定水平滚动,指定后，即使内容宽度小于容器宽度，也会左右划动
            vScroll: false,//是否指定垂直滚动,指定后，即使内容高度小于容器高度，也会上下划动
			momentum: true,//惯性
			bounce: true,//回弹
			bounceMaxX: null,//x轴回弹长度
			bounceMaxY: null,//y轴回弹长度
			speedScale: 1,//阻尼
			zoomed: true,//是否增加缩放手势绑定
			vAutoScrollOutIn: true,//是否允许竖直方向上局部区域与外部区域自动滚动切换
			useTransition: false,//使用transition动画
			isDispatchClick: true,//是否动态创建click事件派发
			isForceUse2d: false, //是否强制使用2d渲染，在某些浏览器上3d渲染存在bug，尽管支持
			
			snap: false, //snap，目前仅支持x方向
			snapThreshold: 200,

			onScroll: null,//滚动过程中响应事件，包括正常手指同步滚动以及惯性过程中的实时滚动
			onTouchStart: function(e) { $.os.android && e.preventDefault(); },//防止低性能android易触发页面滚动
			onTouchMoveStart: null,
			onTouchMoveEnd: null,
			onTouchEnd: null,
			onGestureStart: null,
			onGestureChange: null,
			onGestureEnd: null,
			onTransitionEnd: null,//动画结束后响应事件，包括回弹和惯性
			onBounceEnd: null, //回弹结束后响应事件
			onMomentumStart: null, //惯性之前响应事件
			onScrollEnd: null,//滚动结束后事件响应
			onSnapStart:null,//snap 触发时
			onSnapUpdateEnd: null,//snap 更新结束
			onSnapBounceEnd: null //snap 回弹结束
		};
		this.steps = [];
		this._data = {
			scale: 1,//scale
			initX: 0,//初始x位移
			initY: 0,//初始y位移
			startTime: 0,//touchstart时间
			pointX: 0,//手指触摸位置x
			pointY: 0,//手指触摸位置y
			isMoveX: false,//是否横向移动
			isMoveY: false,//是否纵向移动
			moved: false,//是否发生了移动
			distX: 0,//手指移动距离x
			distY: 0,//手指移动距离y
			adjustDistX: 0,//调整后的移动距离x
			adjustDistY: 0,//调整后的移动距离y
			currentX: 0,//当前x坐标
			currentY: 0,//当前y坐标
			isGesture: false,//是否要发生缩放手势
			scrollerOffset: null//手势dom的offset  
		},
		this._base = {
			$container: null,//容器节点
			$scroller: null,//滚动节点
			containerHeight: null,//容器高
			containerWidth: null//容器宽
		},

		$.extend(this._options, options);
		this.refresh();
		this._delegateEvent(EV_TOUCHSTART);
		this._delegateEvent(EV_TOUCHMOVE);
		this._delegateEvent(EV_TOUCHEND);
		this._delegateEvent(EV_TOUCHCANCEL);
		if(this._options.useTransition){
			this._delegateEvent(EV_TRANSEND);
		}
		if(this._options.zoomed){
			this._delegateEvent(EV_GESTURESTART);
			this._delegateEvent(EV_GESTURECHANGE);
			this._delegateEvent(EV_GESTUREEND);
		}
		// 如果设置了isForceUse2d为true，则表明强制使用2d
		if (this._options.isForceUse2d) {
			support3d = false;
		}
	};
	iGesture.prototype = {
		_snaping: '',
		_handleEvent: function (e) {
	        var _this = this;
	        switch(e.type) {
	        	case EV_TOUCHSTART:
	        		_this._touchStart(e);
	        		break;
	        	case EV_TOUCHMOVE:
	        		_this._touchMove(e);
	        		break;
	        	case EV_TOUCHEND:
	        	case EV_TOUCHCANCEL:
	        		_this._touchEnd(e);
	        		break;
	            case EV_GESTURESTART:
					_this._gestureStart(e);
	                break;
	            case EV_GESTURECHANGE: 
					_this._gestureChange(e);
					break;
	            case EV_GESTUREEND:
					_this._gestureEnd(e);
					break;
				case EV_TRANSEND: 
					_this._transitionEnd(e); 
	        }
	    },
	    refresh: function(){
	    	var _this = this,
	    		_data = _this._data,
	    		_base = _this._base,
	    		_options = _this._options;
	    	_base.$container = typeof _options.container === 'string'? _options.wrap.find(_options.container).first(): _options.container;
	    	if(!_base.$container || !_base.$container.length){
	    		return false;
	    	}
	    	_offset = _base.$container.offset();
	    	_base.containerHeight = _offset.height;
	    	_base.containerWidth = _offset.width;
	    	_base.$scroller = typeof _options.selector === 'string' ? _base.$container.find(_options.selector).first(): _options.selector;
	    	if(!_base.$scroller || !_base.$scroller.length){
	    		return false;
	    	}
	    	_data.scrollerOffset = _base.$scroller.offset();
	    },
	    _preventDefault: function(e){
	    	e.preventDefault();
	    },
	    _touchStart: function(e){
	    	var _this = this,
	    		_data = _this._data,
	    		_base = _this._base,
	    		_options = _this._options;
	    	
	    	if(typeof _options.container === 'string'){
	    		_base.$container = $(e.target).closest(_options.container);
	    	}else{
	    		_base.$container = _options.container;
	    	}
	    		
	    	var _offset = _base.$container.offset();
	    	_this._enabledTouch = true;
	    	_this._data.isGesture = false;
	    	_base.$scroller = typeof _options.selector === 'string' ? $(e.target).closest(_options.selector): _options.selector;
	    	_base.$scroller.bind('click',_this._preventDefault);
	    	_base.containerHeight = _offset.height;
	    	_base.containerWidth = _offset.width;
	    	_data.startTime = e.timeStamp || Date.now();
	    	!_this._snaping && cancelFrame(_this.aniTime);
	    	_options.useTransition && _this.transitionTime(0);
	    	_data.initX = _data.currentX;
	    	_data.initY = _data.currentY;
	    	_data.startX = _data.currentX;
	    	_data.startY = _data.currentY;
	   		_data.moved = false;
	    	$.isFunction(_options.onTouchStart) && _options.onTouchStart.call(_this, e);
	    	_data.scrollerOffset = _base.$scroller.offset();

	    	_data.isMoveX = (_data.scrollerOffset.width > _base.containerWidth)? true : false;
	    	_data.isMoveY = (_data.scrollerOffset.height > _base.containerHeight)? true : false;	
	    	_data.minScrollX = _data.isMoveX? (_base.containerWidth - _data.scrollerOffset.width - (_data.scale - 1) * _data.scrollerOffset.width / 2): 0;
	    	_data.minScrollY = _data.isMoveY? (_base.containerHeight - _data.scrollerOffset.height - (_data.scale - 1) * _data.scrollerOffset.height / 2): 0;
	    	_data.maxScrollX = _data.isMoveX? (_data.scale - 1) * _data.scrollerOffset.width / 2: 0;
	    	_data.maxScrollY = _data.isMoveY? (_data.scale - 1) * _data.scrollerOffset.height / 2: 0;
	    	_data.isMoveX = _options.hScroll || _data.isMoveX;
	    	_data.isMoveY = _options.vScroll || _data.isMoveY;
	    	_options.bounceMaxX = m.abs(_options.bounceMaxX) || _base.containerWidth;
	    	_options.bounceMaxY = m.abs(_options.bounceMaxY) || _base.containerHeight;
	    	
	    	if(e.touches.length === 1) {
				_data.moved = false;
				_data.pointX = e.touches[0].pageX;
				_data.pointY = e.touches[0].pageY;
			}
	    },
	    _touchMove: function(e){
	    	var _this = this,
	    		_options = _this._options,
	    		_base = _this._base,
	    		_data = _this._data,
	    		_timestamp = Date.now();
	    	if(_this._snaping || e.touches.length !== 1) {
                _data.pointX = e.touches[0].pageX;
                _data.pointY = e.touches[0].pageY;
                _this._enabledTouch = false;
                $.isFunction(_this._options.onTouchMoveStart) && _this._options.onTouchMoveStart.call(_this, e);
                return false;
            }
	    	_data.moved = true;
	    	_data.distX = e.touches[0].pageX - _data.pointX;
			_data.distY = e.touches[0].pageY - _data.pointY;
			_data.adjustDistX = _data.isMoveX ? _data.distX: 0;
			_data.adjustDistY = _data.isMoveY ? _data.distY: 0;
			_data.adjustDistX = _data.adjustDistX/_data.scale + _data.initX;
			_data.adjustDistY = _data.adjustDistY/_data.scale + _data.initY;
			if(_timestamp - _data.startTime > momentumTime) {
				_data.startTime = _timestamp;
				_data.startX = _data.currentX;
	    		_data.startY = _data.currentY;
			}
			if(_this._options.vAutoScrollOutIn){
				if((_data.adjustDistY > _data.maxScrollY && _data.initY == _data.maxScrollY)||(_data.adjustDistY < _data.minScrollY && _data.initY == _data.minScrollY)){
					this._enabledTouch = false;
					$.os.android && window.scrollTo(0, window.pageYOffset - _data.distY );
				}else{
					e.preventDefault();
				}
			}
			if(_this._options.bounce){
				_data.adjustDistX = _data.adjustDistX >= _data.maxScrollX? 
									(_data.adjustDistX - _data.maxScrollX) * _options.bounceMaxX / _base.containerWidth + _data.maxScrollX:
									(_data.adjustDistX < _data.minScrollX? 
									(_data.adjustDistX - _data.minScrollX) * _options.bounceMaxX / _base.containerWidth + _data.minScrollX: _data.adjustDistX);
									
				_data.adjustDistY = _data.adjustDistY >= _data.maxScrollY? 
									(_data.adjustDistY - _data.maxScrollY) * _options.bounceMaxY / _base.containerHeight + _data.maxScrollY:
									(_data.adjustDistY < _data.minScrollY? 
									(_data.adjustDistY - _data.minScrollY) * _options.bounceMaxY / _base.containerHeight + _data.minScrollY: _data.adjustDistY);
			}else{
				_data.adjustDistX = _data.adjustDistX > _data.maxScrollX? _data.maxScrollX: (_data.adjustDistX < _data.minScrollX? _data.minScrollX: _data.adjustDistX);
				_data.adjustDistY = _data.adjustDistY > _data.maxScrollY? _data.maxScrollY: (_data.adjustDistY < _data.minScrollY? _data.minScrollY: _data.adjustDistY);
			}
				
			$.isFunction(_this._options.onTouchMoveStart) && _this._options.onTouchMoveStart.call(_this, e);
			if(!_this._enabledTouch){
				return false;
			}

			_this.render(_this._base.$scroller, _data.scale, _data.adjustDistX, _data.adjustDistY);
			$.isFunction(_this._options.onTouchMoveEnd) && _this._options.onTouchMoveEnd.call(_this, e);
	    },
	    _touchEnd: function(e){
	    	var _this = this,
	    		_data = _this._data,
	    		_base = _this._base,
	    		_options = _this._options,
	    		_momentumX = { dist:0, time:0 },
	    		_momentumY = { dist:0, time:0 },
	    		_duration = (e.timeStamp || Date.now()) - _data.startTime,
	    		_newDuration, 
	    		_snapPos,
	    		_newPosX,
	    		_newPosY;
	    	if(!this._enabledTouch){
	    		_data.initX = _data.currentX;
				_data.initY = _data.currentY;
				if(_this._snaping){
					return false;
				}
				_newPosX = _data.currentX;
				_newPosY = _data.currentY;
				_snapPos = _data.initX + _data.distX / m.abs(_data.distX) * _options.snapThreshold;
				if(_options.snap && _snapPos >= _data.minScrollX && _snapPos <= _data.maxScrollX){
					if(_duration < snapTime || m.abs(_data.distX) > snapTriggerRatio * _base.containerWidth){
						_newPosX = _data.initX + (_data.distX / m.abs(_data.distX)) * _options.snapThreshold;	
					}else{
						_newPosX = _data.initX;
					}
					_this.snap(_newPosX, _newPosY);
				}
			}else if(_data.moved){
				$.isFunction(_this._options.onMomentumStart) && _this._options.onMomentumStart.call(_this, e);	
				_newPosX = _data.currentX;
				_newPosY = _data.currentY;
				_snapPos = _data.initX + _data.distX / m.abs(_data.distX) * _options.snapThreshold;
				if(_options.snap && _snapPos >= _data.minScrollX && _snapPos <= _data.maxScrollX){
					if(_duration < snapTime || m.abs(_data.distX) > snapTriggerRatio * _base.containerWidth){
						_newPosX = _data.initX + (_data.distX / m.abs(_data.distX)) * _options.snapThreshold;	
					}else{
						_newPosX = _data.initX;
					}
					_this.snap(_newPosX, _newPosY);
					$.isFunction(_this._options.onTouchEnd) && _this._options.onTouchEnd.call(_this);
					return;
				}
				if(_duration < momentumTime && _options.momentum){
					_momentumX = _newPosX? _this._momentum(_newPosX - _data.startX, _duration, -_newPosX, _data.scrollerOffset.width - _base.containerWidth + _newPosX, _options.bounce?_base.containerWidth: 0): _momentumX;
                	_momentumY = _newPosY? _this._momentum(_newPosY - _data.startY, _duration, -_newPosY, _data.scrollerOffset.height - _base.containerHeight + _newPosY, _options.bounce? _base.containerHeight: 0): _momentumY;

	                _newPosX = _newPosX + _momentumX.dist;
	                _newPosY = _newPosY + _momentumY.dist;
	                if ((_data.currentX > _data.maxScrollX && _newPosX > _data.maxScrollX) || (_data.currentX < _data.minScrollX && _newPosX < _data.minScrollX)){
                        _momentumX = { dist: 0, time: 0};
                    }
	                if ((_data.currentY < _data.minScrollY && _newPosY < _data.minScrollY) || ( _data.currentY > _data.maxScrollY && _newPosY > _data.maxScrollY)){
                        _momentumY = { dist:0, time:0 };
                    }
				}
				if (_momentumX.dist || _momentumY.dist) {
	                _newDuration = m.max(m.max(_momentumX.time, _momentumY.time), 10);
	                _newPosX = m.round(_newPosX);
	                _newPosY = m.round(_newPosY);
	                _this.scrollTo(_newDuration, _newPosX, _newPosY);
	                _data.initX = _newPosX;
					_data.initY = _newPosY;
            	}else{
            		_this.fixPosition();
            	}
	    	}else{
	    		_base.$scroller.unbind('click',_this._preventDefault);
	    		//android 由于touchstart阻止了默认事件，所以此刻要派发，setTimeout的目的防止出现连击，350ms是个测试值
	    		if(_options.isDispatchClick && $.os.android && e.type !== EV_TOUCHCANCEL){
	    			setTimeout(function(){
						var target = e.target;
						while (target.nodeType != 1) {
							target = target.parentNode;
						}
						if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
							var ev = document.createEvent('MouseEvents');
							ev.initMouseEvent('click', true, true, e.view, 1,
								e.screenX, e.screenY, e.clientX, e.clientY,
								e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
								0, null);
							ev._fake = true;
							target.dispatchEvent(ev);
						}
					},doubleClickTime);
	    		}	
	    	}
	    	$.isFunction(_this._options.onTouchEnd) && _this._options.onTouchEnd.call(_this, e);
	    },
		_gestureStart: function(e){
			var _this = this;
			_this._enabledGesture = true;
			$.isFunction(_this._options.onGestureStart) && _this._options.onGestureStart.call(_this, e);
		},
		_gestureChange: function(e){
			e.preventDefault();//此处要强制禁止，否则会引起页面的变化
			var _this = this;
			_this._data.newScale = e.scale*_this._data.scale;
			if(!this._enabledGesture){
				return false;
			}
	        _this.render(_this._base.$scroller, _this._data.newScale, _this._data.initX, _this._data.initY);
			$.isFunction(_this._options.onGestureChange) && _this._options.onGestureChange.call(_this, e);
		},
		_gestureEnd: function(e){
			var _this = this;	
			_this._data.scale = _this._data.newScale;
			_this._data.isGesture = true;
			$.isFunction(_this._options.onGestureEnd) && _this._options.onGestureEnd.call(_this, e); 
		},
		_transitionEnd: function(e){
			var _this = this;
			if (e.target != _this._base.$scroller[0]){
				return;
			}
			_this.fixPosition();
            //type === 'bounce' && $.isFunction(_this._options.onBounceEnd) && _this._options.onBounceEnd.call(_this);
			_this._snaping == 'snapBounce' && $.isFunction(_this._options.onSnapBounceEnd) && _this._options.onSnapBounceEnd.call(_this, e);            
            _this._snaping == 'snapUpdate' && $.isFunction(_this._options.onSnapUpdateEnd) && _this._options.onSnapUpdateEnd.call(_this, e);            
			$.isFunction(_this._options.onTransitionEnd) && _this._options.onTransitionEnd.call(_this);
			_this._snaping = '';
		},
		_delegateEvent: function(type, el, container){
			var _this = this,_options = _this._options;
			if(typeof _options.selector == 'object'){
				_options.selector.bind(type, function(e){
					_this._handleEvent.call(_this, e);
				});
				return ;
			}
			 (container || _options.wrap || _options.container).delegate(el || _options.selector, type, function(e){
			 	_this._handleEvent.call(_this, e);
			 });
		},
		transitionTime: function (time) {
			this._base.$scroller.css('-webkit-transition-duration', time + 'ms');
		},
        /**
         * @memberof $.iGesture
         * @desc 滑动结束时调整滑动位置
         * @param {Object} $scroller 滑动组件对象
         */
		fixPosition: function($scroller){
			var _this = this,
				_data = _this._data,
				_base = _this._base,
				_resetX = _data.currentX,
				_resetY = _data.currentY;
			$scroller = $scroller || _this._base.$scroller;
			var _offset = _this._options.zoomed?$scroller.offset()
						 : {
							width: _data.scrollerOffset.width,
							height: _data.scrollerOffset.height,
							left: _data.currentX,
							top: _data.currentY
						  };
			_data.isMoveX = (_offset.width > _base.containerWidth)? true: false;
			_data.isMoveY = (_offset.height > _base.containerHeight)? true: false;		
			if(!_data.isMoveY) { {
					_resetY = 0;
				}
			} else {
				var _top = _offset.top ;//- _this._options.container.offset().top;
				if(_top > 0) {
					_resetY = _resetY - _top / _data.scale;
				} else if(_top + _offset.height < _base.containerHeight) {
					_resetY = _resetY - (_top + _offset.height - _base.containerHeight) / _data.scale;
				}
			}
			if(!_data.isMoveX) { 
				_resetX = 0;
			} else {
				if(_offset.left > 0) {
					_resetX = _resetX - _offset.left / _data.scale;
				} else if(_offset.left + _offset.width <  _base.containerWidth) {
					_resetX = _resetX - (_offset.left + _offset.width -  _base.containerWidth) / _data.scale;
				}
			}
			if(_data.scale < 1) {
				_data.scale = 1;
			}
			_data.scaled = false;
			_data.initX = _resetX;
			_data.initY = _resetY;
			if(_resetX == _data.currentX&&_resetY == _data.currentY){
				$.isFunction(_this._options.onScrollEnd) && _this._options.onScrollEnd.call(_this);
				return false;
			}	
			if(_this._options.bounce){
				_this.scrollTo(200, _resetX, _resetY, 'bounce');	
			}else{
				_this.render($scroller, _data.scale, _resetX, _resetY);
			}	
		},
        /**
         * @memberof $.iGesture
         * @desc snap
         * @param {Number} x
         * @param {Number} y
         */
		snap: function(x, y){
			var _this = this,
	    		_data = _this._data,
	    		_type = x != _data.initX? 'snapUpdate':'snapBounce';
			_data.initX = x;
			_data.initY = y;
			_this._snaping = _type;
			$.isFunction(_this._options.onSnapStart) && _this._options.onSnapStart.call(_this);	
			_this.scrollTo(200, x, y, _type);
		},
        /**
         * @memberof $.iGesture
         * @desc 指定滑动到某位置
         * @param {Number} time 执行动画的时间，默认值0
         * @param {Number} x 滑动终点的x坐标
         * @param {Number} y 滑动终点的y坐标
         * @param {String} type 动画类型
         */
		scrollTo: function(time, x, y, type){
			var _this = this;
			x = (x == undefined)? _this._data.initX: x;
			y = (y == undefined)? _this._data.initY: y;
			_this.stop();
			_this.steps.push({ x: x, y: y, time: time || 0 });
			_this._startAni(type);
		},
        /**
         * @memberof $.iGesture
         * @desc 设置滑动对象的left、top为指定的值
         * @param {Object} $scroller 滑动对象
         * @param {Number} scale
         * @param {Number} left x坐标
         * @param {Number} top y坐标
         * @returns {boolean}
         */
		render: function($scroller,scale,left,top){
			var _this = this;
			if(!$scroller[0]){
				return false;
			}	
			scale = scale ||1;
			left = left || 0;
			top = top || 0;
			if(!_this._options.zoomed||$.os.ios) {
				$scroller[0].style.webkitTransform = "scale(" + scale + ") " + (support3d ? "translate3d" : "translate") + "(" + left + "px, " + top + "px" + (support3d ? ", 0px)" : ")");
			} else {
				//安卓低版本（2.3）有渲染bug
				$scroller[0].style.webkitTransform = "scale(" + scale + ")";
				$scroller.parent()[0].style.webkitTransform = (support3d ? "translate3d" : "translate") + "(" + left * scale + "px, " + top * scale + "px" + (support3d ? ", 0px)" : ")");
			}
			_this._data.currentX = left;
            _this._data.currentY = top;	
            $.isFunction(_this._options.onScroll)&&_this._options.onScroll.call(_this);

		},
		
		 _momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
            var _deceleration = 0.0006,
                _speed = m.abs(dist) * (this._options.speedScale||1) / time,
                _newDist = (_speed * _speed) / (2 * _deceleration),
                _newTime = 0, _outsideDist = 0;
            // Proportinally reduce _speed if we are outside of the boundaries
            if (dist > 0 && _newDist > maxDistUpper) {
                _outsideDist = size / (6 / (_newDist  /_speed * _deceleration));
                maxDistUpper = maxDistUpper + _outsideDist;
                _speed = _speed * maxDistUpper / _newDist;
                _newDist = maxDistUpper;
            } else if (dist < 0 && _newDist > maxDistLower) {
                _outsideDist = size / (6 / (_newDist / _speed * _deceleration));
                maxDistLower = maxDistLower + _outsideDist;
                _speed = _speed * maxDistLower / _newDist;
                _newDist = maxDistLower;
            }
            _newDist = _newDist * (dist < 0 ? -1 : 1);
            _newTime = _speed / _deceleration;
            return {dist: _newDist, time: m.round(_newTime)};
        },

        //使用动画效果
		_startAni: function (type){
            var _this = this,
            	_data = _this._data,
                startX = _data.currentX, 
                startY = _data.currentY,
                startTime = Date.now(),
                step, 
                easeOut,
                animate,
                _$scroller =_this._base.$scroller;
            if(_this.animating || !_this.steps.length){
                return;
            }
            step = _this.steps.shift();
            if(step.x == startX && step.y == startY) {
            	step.time = 0;
            }
            _this.animating = true;
            if (_this._options.useTransition) {
				_this.transitionTime(step.time);
				_this.render(_$scroller, _data.scale, step.x, step.y);
				_this.animating = false;
				return;
			}
            animate = function () {
                var now = Date.now(),
                    newX, newY;
                if (now >= startTime + step.time) {
                    _this.render(_$scroller, _data.scale, step.x, step.y);
                    _this.animating = false;
                    _this.fixPosition();
                    $.isFunction(_this._options.onTransitionEnd) && _this._options.onTransitionEnd.call(_this);
                    type === 'bounce' && $.isFunction(_this._options.onBounceEnd) && _this._options.onBounceEnd.call(_this);
                    type === 'snapBounce' && $.isFunction(_this._options.onSnapBounceEnd) && _this._options.onSnapBounceEnd.call(_this);
                    type === 'snapUpdate' && $.isFunction(_this._options.onSnapUpdateEnd) && _this._options.onSnapUpdateEnd.call(_this);
                    _this._snaping = '';
                    return;
                }
                now = (now - startTime) / step.time - 1;
                easeOut = m.sqrt(1 - now * now);
                newX = (step.x - startX) * easeOut + startX;
                newY = (step.y - startY) * easeOut + startY;
                _this.render(_$scroller, _data.scale, newX, newY);
                if (_this.animating){
	                _this.aniTime = nextFrame(animate);	
                } 
            };
            animate();
        },       
        stop: function () {
            cancelFrame(this.aniTime);
            this.steps = [];
            this.animating = false;
        },
        /**
         * @desc 设置滑动对象的相关参数，参数类型与new对象时的参数一致
         * @param {String} key
         * @param {String|Number|Function} value
         */
        setOptions: function(key,value){
        	this._options[key] = value;
        },
        /**
         * @memberof $.iGesture
         * @desc 设置滑动相关的数据，针对同一页面中有多个滚动区域的情况，可以通过这种方式设置在多个区域切换时的初始位置
         * @param {String} key
         * @param {String|Number} value
         * @example $scroller.setData("initX",100)
         */
		setData: function(key,value){
			this._data[key] = value;
		},
        /**
         * @memberof $.iGesture
         * @desc 获取当前的滑动相关的数据
         * @param {String} key
         */
		getData: function(key){
			return this._data[key];
		},
        /**
         * @desc 设置base数据，包括滑动对象、容器、容器长宽
         * @param {String} key
         * @param {String|Object} value
         */
		setBaseData: function(key,value){
			this._base[key] = value;
		},
        /**
         * @desc 获取base数据，包括滑动对象、容器、容器长宽
         * @param {String} key
         * @returns {*}
         */
		getBaseData: function(key){
			return this._base[key];
		},
        /**
         *
         * @returns {string}
         */
		getSnapingStatus: function(){
			return this._snaping;
		},
        /**
         *
         * @param value
         */
		setSnapingStatus: function(value){
			this._snaping = value;
		},
        /**
         * @memberof $.iGesture
         * @desc 恢复初始位置
         * @param {Object} $scroller
         */
		resetDatas: function($scroller){
			if(!$scroller[0]){
				return false;
			}
			var _scale = this._data.scale;
			$.extend(this._data, {
				scale: 1,
				initX: 0,
				initY: 0,
				startTime: 0,
				pointX: 0,
				pointY: 0,
				isMoveX: false,
				isMoveY: false,
				moved: false,
				distX: 0,
				distY: 0,
				adjustDistX: 0,
				adjustDistY: 0,
				currentX: 0,
				currentY: 0,
				isGesture: false
			});
			if(_scale !== 1||$scroller.height() > this._base.containerHeight){
				this.render($scroller);
			}
		},
        /**
         * @memberof $.iGesture
         * @desc 设置允许touch
         */
		enableTouch: function () { 
	        this._enabledTouch = true; 
	    },
        /**
         * @memberof $.iGesture
         * @desc 设置禁止touch
         */
		disableTouch: function(){
			this.stop();
			this._enabledTouch = false;
		},
        /**
         * @memberof $.iGesture
         * @desc 设置允许手势缩放
         */
		enableGesture: function () { 
	        this._enabledGesture = true; 
	    },
        /**
         * @memberof $.iGesture
         * @desc 设置禁止手势缩放
         */
		disableGesture: function(){
			this._enabledGesture = false;
		},
        /**
         * @memberof $.iGesture
         * @desc unbind滑动对象上的事件
         */
		destory: function(){
			var _options = this._options,
			$container = _options.wrap? _options.wrap: _options.container;
			if(typeof _options.selector === 'string'){
				$container.undelegate(this._options.selector);
			}else{
				_options.selector.unbind();
			}	
		}
	};
	$.iGesture = iGesture; 
})(Zepto);
