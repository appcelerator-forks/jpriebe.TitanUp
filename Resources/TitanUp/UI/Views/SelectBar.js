var TU = null;

/**
 * Provides a cross-platform "tabbed bar" selection view; on iOS, uses the TabbedBar,
 * and on iOS, uses a series of Switch views.  Fires the "TUchange" event (note that this
 * is not the "change" event; see below)
 * 
 * var sb = TU.UI.createSelectBar ({
 * 		labels: ['foo', 'bar', 'baz']
 *      allow_deselect: true,
 * });
 * 
 * sb.addEventListener ('TUchange', function (e) {
 * 	   TU.Logger.debug ('new index: ' + e.index);
 * });
 *
 * sb.xsetSelectedIndex (1);
 * 
 * ...
 * 
 * var selection = sb.xgetSelectedIndex ();
 * 
 * NOTE:
 * We use "TUchange" as the event rather than "change" because on Android, "change" events from
 * the Switches themselves on Android would be sent to the eventListener for the SelectBar's
 * change event; not sure why that's happening.  You would have to filter those out in your event
 * listener if we used "change", so to keep it simpler, we use "TUchange".
 * 
 * NOTE:
 * The width of the control must be divisble evenly by the number of labels; otherwise, Titanium
 * will miscalculate the width of the switch views in android, and the switches will not fit
 * inside the parent view.  Code inside SelectBar will enforce this, but only if you specify an
 * explicit absolute width.  Don't try to just use left and right; instead, get the working area
 * of the parent view, and subtract the margins so you can pass an absolute width to the SelectBar.
 * 
 * @param {Object} params
 */
function SelectBar (params)
{
	var _labels = [];
	var _buttons = [];
	var _self = null;
	var _enabled = true;
	
	var _allow_deselect = true;
	
	var _current_idx = -1;
	
	var onswitchclick = function (e) 
	{
		// Ugh: getValue() doesn't work here -- just use the property directly...
		var btn_val = e.source.value;

		var btn_idx = -1;
		for (var j = 0; j < _buttons.length; j++)
		{
			if (_buttons[j] == e.source)
			{
				btn_idx = j;
				break;
			}
		}
		
		if (btn_idx == -1)
		{
			// this should never happen - punt
			return;
		}
		
		var new_idx = btn_idx;
		if (btn_val)
		{
			if (btn_idx != _current_idx)
			{
				// if we've got a new index, turn off the last button
				if (_current_idx != -1)
				{
					_buttons[_current_idx].setValue (false);
				}
			}
		}
		else
		{
			if (_allow_deselect)
			{
				new_idx = -1;
			}
			else
			{
				e.source.setValue (true);
			}
		}
		
		if (new_idx != _current_idx)
		{
			_current_idx = new_idx;
			_self.fireEvent ('TUchange', { index: _current_idx });
		}
	};

	var _init = function (params)
	{
		if (typeof params.labels == 'undefined')
		{
			return null;	
		}
		_labels = params.labels;
		
		if (typeof params.allow_deselect != 'undefined')
		{
			_allow_deselect = params.allow_deselect;
			delete params.allow_deselect;
		}
	
		if (typeof params.height == 'undefined')
		{
			params.height = Ti.UI.SIZE;
		}
		
        if (typeof params.backgroundColor == 'undefined')
        {
            params.backgroundColor = TU.UI.Theme.darkBackgroundColor;
        }

		if (TU.Device.getOS () == 'ios')
		{
			if (typeof params.style == 'undefined')
			{
				 params.style = Titanium.UI.iPhone.SystemButtonStyle.BAR;
			}
			
			_self = Ti.UI.iOS.createTabbedBar(params);

			_self.addEventListener ('click', function (e) {
			    //TU.Logger.debug ('[SelectBar] click; e.index=' + e.index);
			    if (_current_idx == e.index)
			    {
			        return;
			    }
				_current_idx = e.index;
				_self.fireEvent ('TUchange', { index: _self.xgetSelectedIndex () });
			});

			if (_allow_deselect)
			{
				// @HACK: on iOS, you get a singletap followed by a click event whenever
				// the user changes a value of the TabbedBar.  But if you tap an already-
				// selected button on the bar, you only get the singletap
				_self.addEventListener ('singletap', function (e) {
				    var idx = parseInt (e.x / Math.round (_self.size.width / _labels.length));
                    //TU.Logger.debug ('[SelectBar] singletap; idx=' + idx);
				    if (idx == _current_idx)
				    {
				        _current_idx = -1;
                        _self.setIndex (null);
                        _self.fireEvent ('TUchange', { index: -1 });
				    }
				});
			}
		}
	
		else
		{
			params.layout = 'horizontal';
			var btnw = parseInt (100 / _labels.length); 
			btnw = '' + btnw + '%';

            // make sure width is divisible by the number of themes; this has to do with buggy rounding in
            // percentage-based widths; if the rounding doesn't add up to < 100%, you'll drop the last button
            if (typeof params.width !== 'undefined')
            {
                params.width = params.width - (params.width % _labels.length);
            }

			_self = Ti.UI.createView(params);
			for (var i = 0; i < _labels.length; i++)
			{
				var label = params.labels[i];
				var button = Ti.UI.createSwitch ({
					titleOn: label,
					titleOff: label,
					font: TU.UI.Theme.fonts.small,
					width: btnw
				});
				_buttons.push (button);
				button.addEventListener ('click', onswitchclick);
				_self.add (button);
			}
		}
	};
	
	_init (params);
	if (_self == null)
	{
		return null;
	}
	
	_self.xgetSelectedIndex = function ()
	{
		return _current_idx;
	};
		
	_self.xsetSelectedIndex = function (idx)
	{
		if (idx < -1)
		{
			return;
		}
		if (idx > _labels.length - 1)
		{
			return;
		}
		
		_current_idx = idx;
		
		if (TU.Device.getOS () == 'ios')
		{
			if (idx == -1)
			{
				idx = null;
			}
			
			_self.setIndex (idx);
			return;
		}
		
		for (var i = 0; i < _buttons.length; i++)
		{
			_buttons[i].setValue (false);			
		}
		_buttons[idx].setValue (true);
	};
	
	_self.xsetEnabled = function (enabled)
	{
		_enabled = enabled;
		if (TU.Device.getOS () == 'ios')
		{
			_self.setTouchEnabled (enabled);
			return;
		}
		
		for (var j = 0; j < _buttons.length; j++)
		{
			_buttons[j].enabled = enabled;
		}
	};
	
	return _self;
}


SelectBar.TUInit = function (tu)
{
	TU = tu;
};


module.exports = SelectBar;
