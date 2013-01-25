// Created by: José P. Airosa
// Email: me@joseairosa.com

/**
 * Few notes:
 * - We could add more modularity to the app, but since we're using jQuery to store the elements we're already getting
 * most of the extra modularity needed.
 * - A few variables could be colapsed onto a single options object but I decided to be more verbose for better readability
 * - There are a few "raw" algorithms that could be done using jQuery or any other framework but I decided to provide
 * write them from scratch to show that any developer should know the basics of javascript :)
 * - Enjoy!!
 */

// Our abstracted scope
(function () {

    // Make sure we don't load our game environment more than once
    if (window.TG) return;

    // Initialize our Tile Game (TG) main object
    window.TG = {};

    // Tile matrix. We initialize it empty to make the size of the matrix dynamic
    var tm = [];
    // Storing all original indexes for faster position retrieval
    var tm_position_cache = [];
    // Number of tiles on both axis
    var tm_size = {x:4, y:4};
    // Initialize container for tile sizes that will be calculated on TG.init
    var tile_size = {w:0, h:0};
    // Size of the background image
    var image_size = {w:540, h:540};
    // Drag flag
    var is_being_dragged = false;
    // Gameboard data container
    var gb_data = {};
    // Global container for the current move instructions
    var move_instructions = {};
    // Plays counter
    var plays_counter = 0;
    // Container for the clicked element
    var clicked_element = {};
    // Container for the updated movement amount during a drag action (relative to the game board)
    var moved_amount = {x:0, y:0};
    // Container for the initial position when we click on a tile (relative to the game board)
    var initial_click_position = {x:0, y:0};
    // Container for the current mouse position on a touchmove and mousemove event
    var move_position = {x:0, y:0};
    // Flag to know if we've gone out of bounds. This will remove some further calculations
    var is_out_of_bounds = false;
    // Flag to know if we're dealing with a touch based device or not
    var is_touch_device = false;

    /**
     * Initialize our environment and position the tiles in a random position (shuffle)
     *
     * @param   string  element id where our game board should be generated
     */
    TG.init = function (e) {
        // Save gameboard data for later use
        gb_data.selector = "#" + e;
        var tmp_pos = $(gb_data.selector).offset();
        gb_data.position = {x:tmp_pos.left,y:tmp_pos.top};

        // Calculate the width and height based on the image width and height and number of tiles on the x and y axis
        tile_size.w = (image_size.w / tm_size.x);
        tile_size.h = (image_size.h / tm_size.y);

        // Check if this is touch based
        if ("ontouchstart" in document.documentElement) {
            is_touch_device = true;
        }

        var viewportwidth;
        var viewportheight;

        // The more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
        if (typeof window.innerWidth != 'undefined') {
            viewportwidth = window.innerWidth;
            viewportheight = window.innerHeight;
        }
        // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
        else if (typeof document.documentElement != 'undefined' && typeof document.documentElement.clientWidth != 'undefined' && document.documentElement.clientWidth != 0) {
            viewportwidth = document.documentElement.clientWidth;
            viewportheight = document.documentElement.clientHeight;
        }
        // Older versions of IE
        else {
            viewportwidth = document.getElementsByTagName('body')[0].clientWidth;
            viewportheight = document.getElementsByTagName('body')[0].clientHeight;
        }

        TG.fillMatrix();
        TG.renderBoard(e);
        TG.shuffleTiles();

        // Calculate the gameboard width. Notice that we also take into account the size of the borders, in case
        // we have any.
        var gameboard_width = ($(gb_data.selector).width() + parseInt($(gb_data.selector).css("borderLeftWidth"), 10) + parseInt($(gb_data.selector).css("borderRightWidth"), 10));
        // Only apply this if we know that the width of our browser viewport is smaller than the width of our gameboard.
        // Otherwise we don't need to scale anything. We could tho...
        if (viewportwidth < gameboard_width) {
            // Detect the scale that we need to apply
            var viewport_scale = viewportwidth / gameboard_width;
            var viewport = document.querySelector("meta[name=viewport]");
            viewport.setAttribute('content', 'width=device-width; initial-scale=' + viewport_scale + '; maximum-scale=' + viewport_scale + '; user-scalable=0;');
        }
    };

    /**
     * Iterate through all the tiles in the board and runs a user provided callback
     *
     * @param   fn  user provided callback.
     *              to this callback 3 arguments are provided:
     *                  index - the index of the tile position on the game board
     *                  jj - x axis position
     *                  ii - y axis position
     */
    TG.iterate = function (fn) {
        var index = 0;
        // We change the axis here because I want to go over the x axis first and then iterate the y axis
        for (var ii = 0; ii < tm_size.y; ii++) {
            for (var jj = 0; jj < tm_size.x; jj++) {
                fn(index, jj, ii);
                index++;
            }
        }
    };

    /**
     * Fills the tile matrix with default values. Should be only used on TG.init()
     *
     */
    TG.fillMatrix = function () {
        TG.iterate(function (index, x, y) {
            tm_position_cache.push({x:(x * tile_size.w), y:(y * tile_size.h)});
            tm.push(index);
        });
    };

    /**
     * Shuffles the tile matrix.
     * Used the Fisher-Yates randomizing shuffle algorithm.
     *
     * @return  bool False if the tile matrix is empty.
     */
    TG.shuffleTiles = function () {
        var i = tm.length;
        if (i == 0) return false;
        while (--i) {
            var j = Math.floor(Math.random() * ( i + 1 ));
            var tempi = tm[i];
            var tempj = tm[j];
            tm[i] = tempj;
            tm[j] = tempi;
        }

        // Apply the shuffled board and set the tiles
        for (var ii = 0; ii < tm.length; ii++) {
            axis = TG.getPositionReference(tm.indexOf(ii));
            $('div[tile="' + ii + '"]').css({
                left:axis.x,
                top:axis.y
            });
        }
        return true;
    };

    /**
     * Renders the board onto the element specified on the init method
     */
    TG.renderBoard = function () {

        // Hide our board while we add the tiles and apply the pre-processed shuffle
        $(gb_data.selector).css("display", "none").width(image_size.w).height(image_size.h);

        // Render
        TG.iterate(function (index, x, y) {
            var new_tile = $("<div></div>")
                .attr({tile:index})
                .width(tile_size.w)
                .height(tile_size.h);
            $(gb_data.selector).append(new_tile);
            // Make sure we don't fill the last tile as it will be our freespace
            if (index != (tm_size.x * tm_size.y) - 1) {
                var background_position = (x == 0 && y == 0 ? "0px 0px" : "-" + (tile_size.w * x) + "px -" + (tile_size.h * y) + "px");
                new_tile.css({
                    backgroundPosition:background_position,
                    left:(x * tile_size.w) + "px",
                    top:(y * tile_size.h) + "px"
                }).addClass("tiles tile");
            } else {
                // Add our whitespace
                new_tile.css({
                    left:((tm_size.x - 1) * tile_size.w) + "px",
                    top:((tm_size.y - 1) * tile_size.h) + "px"
                }).addClass("no-tile");
            }
        });

        // Add callbacks to each of the tiles
        $(".tiles")
            .mousedown(function (md_e) {
                clicked_element = $(this);
                TG.onMouseDown(md_e);
            })
            .mouseup(function (mu_e) {
                TG.onMouseUp($(this),mu_e);
            })
            .bind("touchstart", function (ts_e) {
                clicked_element = $(this);
                TG.onTouchStart(ts_e);
            })
            .bind("touchend touchcancel", function (te_e) {
                TG.onTouchEnd($(this),te_e);
            });

        // Show our board again
        $(gb_data.selector).css("display", "block");
    };

    /**
     * Generic method that applies the on down action when a tile is clicked
     *
     * @param   md_e    mouse down event object
     * @param   fn      callback function to be called after making sure the play is valid
     */
    TG.onDown = function (md_e, fn) {
        moved_amount.x = 0;
        moved_amount.y = 0;

        is_being_dragged = true;

        move_instructions = TG.getMoveInstructions(clicked_element.attr("tile"));

        if (move_instructions != false) {
            fn(md_e);
        }
    };

    /**
     * Generic method that applies the on move action when a tile is being moved (normally dragged)
     */
    TG.onMove = function () {
        TG.executeMove(function (index, instruction) {
            // Get the position to where this tile needs to move to
            var initial_position = TG.getPositionReference(instruction.i);

            var p = {
                x:instruction.a == "y" ? initial_position.x : initial_position.x + (moved_amount.x),
                y:instruction.a == "x" ? initial_position.y : initial_position.y + (moved_amount.y)
            };

            // Make sure the user is not able to move the tile in the wrong direction and more than he
            // is able to (more than one gap)
            if (instruction.a == "x" && instruction.d < 0 && p.x > initial_position.x) p.x = initial_position.x;
            else if (instruction.a == "x" && instruction.d > 0 && p.x < initial_position.x) p.x = initial_position.x;
            else if (instruction.a == "x" && instruction.d < 0 && Math.abs(moved_amount.x) > tile_size.w) p.x = initial_position.x - tile_size.w;
            else if (instruction.a == "x" && instruction.d > 0 && Math.abs(moved_amount.x) > tile_size.w) p.x = initial_position.x + tile_size.w;

            if (instruction.a == "y" && instruction.d < 0 && p.y > initial_position.y) p.y = initial_position.y;
            else if (instruction.a == "y" && instruction.d > 0 && p.y < initial_position.y) p.y = initial_position.y;
            else if (instruction.a == "y" && instruction.d < 0 && Math.abs(moved_amount.y) > tile_size.h) p.y = initial_position.y - tile_size.h;
            else if (instruction.a == "y" && instruction.d > 0 && Math.abs(moved_amount.y) > tile_size.h) p.y = initial_position.y + tile_size.h;


            // Make sure the user is not able to move the tile outside gameboard limits
            if (p.x >= image_size.w - tile_size.w) p.x = image_size.w - tile_size.w;
            if (p.y >= image_size.h - tile_size.h) p.y = image_size.h - tile_size.h;
            if (p.x <= 0) p.x = 0;
            if (p.y <= 0) p.y = 0;

            // Make sure that if the user runs his mouse or finger out of the gameboard boundaries we need to do something
            // In this case we force a mouseup/touchend event
            if(move_position.x < gb_data.position.x || move_position.x > (gb_data.position.x+image_size.w) || move_position.y < gb_data.position.y || move_position.y > (gb_data.position.y+image_size.h)) {
                if(is_touch_device) {
                    clicked_element.trigger("touchend");
                } else {
                    clicked_element.trigger("mouseup");
                }
                is_out_of_bounds = true;
                return;
            }

            // Animate the tile to its new position
            $('div[tile="' + tm[instruction.i] + '"]').css({
                top:p.y,
                left:p.x
            });
        });
    };

    /**
     * Generic method that applies the on up action when a tile is released
     *
     * @param   object      mouse up event object
     * @param   method      callback to be called after performing the finishing calculations and before determining if
     *                      the game is over
     */
    TG.onUp = function (mu_e, fn) {
        // We know that if the move_instructions is false we have a invalid play
        if (move_instructions != false) {
            // This is just a container that based on the following move processing will let us know afterwards
            // if we had a valid move or not.
            var valid_move = false;
            TG.executeMove(function (index, instruction) {
                // This is where we check if firstly we have a drag movement and if the drag movement is moved
                // the tile less than half of its way to the new position. If this is the case we need to
                // rollback (all the tiles affected) to the initial position.
                // If we passed more than halfway we can safely move the affected tiles to the new position
                // and update the tile matrix with the movement.
                if (is_out_of_bounds || ((instruction.a == "x" && Math.abs(moved_amount.x) < (tile_size.w / 2) && Math.abs(moved_amount.x) > 0) || (instruction.a == "y" && Math.abs(moved_amount.y) < (tile_size.h / 2) && Math.abs(moved_amount.y) > 0))) {
                    // Get tile inital position
                    var initial_position = TG.getPositionReference(instruction.i);
                    // Animate the tile to its initial position
                    $('div[tile="' + tm[instruction.i] + '"]').animate({
                        top:initial_position.y,
                        left:initial_position.x
                    }, 100);
                    is_out_of_bounds = false;
                } else {
                    valid_move = true;
                    // Get the position to where this tile needs to move to
                    var move_to = TG.getPositionReference(instruction.to_i);
                    // Animate the tile to its new position
                    $('div[tile="' + tm[instruction.i] + '"]').animate({
                        top:move_to.y,
                        left:move_to.x
                    }, 100);
                    // Swap indexes on the tile matrix
                    var tmp = tm[instruction.to_i];
                    tm[instruction.to_i] = tm[instruction.i];
                    tm[instruction.i] = tmp;
                }
            });
            // Only if we have a valid move we should update the play counter
            if (valid_move) TG.addToPlayCount();
            // Cleanup callback
            fn();
            TG.checkGameOver();
        }
        is_being_dragged = false;
    };

    /**
     * Handle the mouse down event
     *
     * @param   object  mouse down event object
     */
    TG.onMouseDown = function (md_e) {
        initial_click_position.x = md_e.pageX;
        initial_click_position.y = md_e.pageY;
        TG.onDown(md_e, function () {
            // Bind a mousemove event onto our gameboard to get access to the mouse coordinates inside it
            $(gb_data.selector).bind('mousemove.move_tile', function (mm_e) {

                // Update current mouse/finger position
                move_position.x = mm_e.pageX;
                move_position.y = mm_e.pageY;

                // Calculate the movement of the tiles
                moved_amount.x = (move_position.x - initial_click_position.x);
                moved_amount.y = (move_position.y - initial_click_position.y);

                TG.onMove();
            });
        });
    };

    /**
     * Handle mouse up event
     *
     * @param   object  mouse up event object
     */
    TG.onMouseUp = function (element,mu_e) {
        TG.onUp(mu_e, function () {
            // Unbind the mousemove event as we don't need it anymore. It's always a good idea to clean the house
            // after the party!
            $(gb_data.selector).unbind('mousemove.move_tile');
        });
    };

    /**
     * Handle touch start event
     *
     * @param   object  touch start event object. Note that this is a jQuery event object and as such, it is needed to
     *                  access the original event
     */
    TG.onTouchStart = function (ts_e) {
        // Make sure we avoid multitouch on the tiles
        if(!is_being_dragged) {
            // I'm saving this here because I was getting some funky behaviour when dragging on a mobile device. Basically
            // while on the move action, both ts_e and tm_e would be updated with the current position, thus no movement
            // was seen.
            initial_click_position.x = ts_e.originalEvent.changedTouches[0].pageX;
            initial_click_position.y = ts_e.originalEvent.changedTouches[0].pageY;
            TG.onDown(ts_e, function () {
                // Bind a mousemove event onto our gameboard to get access to the mouse coordinates inside it
                $(gb_data.selector).bind('touchmove.move_tile', function (tm_e) {

                    tm_e.preventDefault();

                    // Update current mouse/finger position
                    move_position.x = tm_e.originalEvent.changedTouches[0].pageX;
                    move_position.y = tm_e.originalEvent.changedTouches[0].pageY;
                    // Calculate the movement of the tiles
                    moved_amount.x = (move_position.x - initial_click_position.x);
                    moved_amount.y = (move_position.y - initial_click_position.y);

                    TG.onMove();
                });
            });
        }
    };

    /**
     * Handle touch end event
     *
     * @param   object  touch end event object. Note that this is a jQuery event object and as such, it is needed to
     *                  access the original event
     */
    TG.onTouchEnd = function (element,te_e) {
        // Make sure we avoid multitouch on the tiles
        if(element.attr("tile") == clicked_element.attr("tile")) {
            TG.onUp(te_e, function () {
                // Unbind the touchmove event as we don't need it anymore. It's always a good idea to clean the house
                // after the iOS party!
                $(gb_data.selector).unbind('touchmove.move_tile');
            });
        }
    };

    /**
     * Adds a play count and outputs it onto the game counter container element
     */
    TG.addToPlayCount = function () {
        var o = $("#gameCounter");
        // If we actually have a game counter specified.
        if (o.length > 0) {
            plays_counter++;
            o.html(plays_counter + (plays_counter == 1 ? " play" : " plays"));
        }
    }

    /**
     * Check if we have completed our game by aligning our tile matrix.
     * In order for us to know that the game is over the tile matrix should be filled with indexes in a sequecial order
     *
     * @return  bool    True if the game is over and false if not
     */
    TG.checkGameOver = function () {
        var index = 0;
        for (var key in tm) {
            if (index != tm[key]) {
                return false;
            }
            index++;
        }
        $(gb_data.selector)
            .append(
            $("<div></div>").css({
                position:"absolute",
                backgroundColor:"#fff",
                opacity:.8,
                zIndex:3
            })
                .width(image_size.w)
                .height(image_size.h)
        )
            .append(
            $("<div></div>")
                .attr('id', 'gameOverInfo')
                .css({
                    position:"absolute",
                    top:"180px",
                    left:"60px",
                    zIndex:4
                })
                .html('<div style="float:left;"><img src="assets/img/f_logo.png" width="140" height="140" title="Facebook" alt="Game Over - Congratulations"/></div><div style="float:right;margin-left:30px;"><h1>Congratulations!</h1><br/>You just finished the game!<br/>Here, have a digital cookie :)</div>')
        );
        return true;
    };

    /**
     * For a given index get the tile position
     *
     * @param   int The index for which position we want to get the coordinates
     * @return  object  with the x and y coordinates
     */
    TG.getPositionReference = function (index) {
        return tm_position_cache[index];
    };

    /**
     * Return the index of the tile from its current axis
     *
     * @param   int the x axis position
     * @param   int the y axis position
     * @return  int the index
     */
    TG.getIndexReferenceByAxis = function (x, y) {
        return y * tm_size.x + x;
    };

    /**
     * Get the position of the white space
     *
     * @return object  with the x and y coordinates
     */
    TG.getBlankSpot = function () {
        return TG.getPositionReference(tm.indexOf(tm.length - 1));
    };

    /**
     * For a given x axis tile position get the corresponding index
     *
     * @example 135px -> index 1
     *
     * @param   int x axis position
     * @return  int index
     */
    TG.getTileReferenceFromX = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.w));
    };

    /**
     * For a given y axis tile position get the corresponding index
     *
     * @example 135px -> index 1
     *
     * @param   int y axis position
     * @return  int index
     */
    TG.getTileReferenceFromY = function (axis) {
        return (parseInt(axis) / parseInt(tile_size.h));
    };

    /**
     * Make a tile move based on the move instructions previously set
     *
     * @param   method  the callback to execute on every tile that needs to move
     *                  2 parameters will be provided to the callback:
     *                      key - the index of instruction object array
     *                      move_instructions - the instructions for a specific tile
     */
    TG.executeMove = function (fn) {
        if (move_instructions != false) {
            for (var key in move_instructions) {
                fn(key, move_instructions[key]);
            }
        }
    };

    /**
     * From a given interacted index calculate all the movements
     *
     * @param   int             the index that was interacted for movement
     * @return  array|bool      if false this is an illigal move
     *                          if array we have a move instructions object array
     */
    TG.getMoveInstructions = function (i) {

        var index = tm.indexOf(parseInt(i));
        clicked_ref = TG.getPositionReference(index);
        blank_ref = TG.getBlankSpot();

        is_x_move = !!(clicked_ref.y == blank_ref.y);
        is_y_move = !!(clicked_ref.x == blank_ref.x);

        // Check if this is an illigal move
        // If illigal we should return false
        if ((!is_x_move && !is_y_move) || (is_x_move && is_y_move)) {
            return false;
        }

        move_to_right = !!(clicked_ref.x - blank_ref.x < 0);
        move_to_bottom = !!(clicked_ref.y - blank_ref.y < 0);

        var clicked_ref_x = TG.getTileReferenceFromY(clicked_ref.x);
        var clicked_ref_y = TG.getTileReferenceFromY(clicked_ref.y);
        var blank_ref_x = TG.getTileReferenceFromY(blank_ref.x);
        var blank_ref_y = TG.getTileReferenceFromY(blank_ref.y);

        // Check if this is a x axis move
        tmp_array_move = [];
        if (is_x_move) {
            if (move_to_right) {
                for (var ii = clicked_ref_x; ii < blank_ref_x; ii++) {
                    tmp_array_move.push({
                        a:"x",
                        d:1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii + 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii + 1,
                        to_y:clicked_ref_y
                    });
                }
            } else {
                for (var ii = TG.getTileReferenceFromX(clicked_ref.x); ii > TG.getTileReferenceFromX(blank_ref.x); ii--) {
                    tmp_array_move.push({
                        a:"x",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(ii, clicked_ref_y),
                        to_i:TG.getIndexReferenceByAxis(ii - 1, clicked_ref_y),
                        x:ii,
                        y:clicked_ref_y,
                        to_x:ii - 1,
                        to_y:clicked_ref_y
                    });
                }
            }
        }
        // Check if this is a y axis move
        else if (is_y_move) {
            if (move_to_bottom) {
                for (var ii = clicked_ref_y; ii < blank_ref_y; ii++) {
                    tmp_array_move.push({
                        a:"y",
                        d:1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii + 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii + 1
                    });
                }
            } else {
                for (var ii = clicked_ref_y; ii > blank_ref_y; ii--) {
                    tmp_array_move.push({
                        a:"y",
                        d:-1,
                        i:TG.getIndexReferenceByAxis(clicked_ref_x, ii),
                        to_i:TG.getIndexReferenceByAxis(clicked_ref_x, ii - 1),
                        x:clicked_ref_x,
                        y:ii,
                        to_x:clicked_ref_x,
                        to_y:ii - 1
                    });
                }
            }
        } else {
            return false
        }

        // We reverse the array in order to have them in the correct order of movement.
        return tmp_array_move.reverse();
    };

})();
